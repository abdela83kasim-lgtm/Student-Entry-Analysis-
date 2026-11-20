import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { RecordItem } from '../types';

// In-memory token cache (NEVER stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Create provider with Google Sheets and Drive scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

export const initGoogleAuthListener = (
  onSuccess?: (user: User, token: string) => void,
  onSignedOut?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onSignedOut) onSignedOut();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token from Google authentication result.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  cachedAccessToken = null;
};

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * List recent Google Sheets files from user's Drive using Drive v3 API
 */
export const listDriveSpreadsheets = async (token: string): Promise<DriveSpreadsheetFile[]> => {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=20&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime,webViewLink)`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list Google Sheets: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Create a new Google Spreadsheet with default header and optional initial rows
 */
export const createGoogleSpreadsheet = async (
  token: string,
  title: string,
  records: RecordItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  // 1. Create Spreadsheet container
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title || 'OSU Active Student Admissions Data'
      },
      sheets: [
        {
          properties: {
            title: 'Active Student Records',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${createRes.status} ${errText}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Format records into rows
  const headers = [
    'Record ID',
    'Academic Year',
    'Program Level',
    'Department / Faculty',
    'Study Mode',
    'Campus Location',
    'Male Entrants',
    'Female Entrants',
    'Total Entrants',
    'Source Cell Ref'
  ];

  const rows = records.map((r) => [
    r.id,
    r.year,
    r.program,
    r.department,
    r.mode,
    r.campus || 'Main Campus',
    r.male ?? 0,
    r.female ?? 0,
    r.total ?? 0,
    r.sourceCell || ''
  ]);

  const valueData = [headers, ...rows];

  // 3. Populate sheet with data
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Active Student Records'!A1:J${valueData.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'Active Student Records'!A1:J${valueData.length}`,
        majorDimension: 'ROWS',
        values: valueData
      })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to write values into Google Spreadsheet: ${updateRes.status} ${errText}`);
  }

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Append or Overwrite active student records to an existing Google Spreadsheet
 */
export const syncRecordsToExistingSheet = async (
  token: string,
  spreadsheetId: string,
  sheetName: string,
  records: RecordItem[],
  mode: 'overwrite' | 'append'
): Promise<void> => {
  const headers = [
    'Record ID',
    'Academic Year',
    'Program Level',
    'Department / Faculty',
    'Study Mode',
    'Campus Location',
    'Male Entrants',
    'Female Entrants',
    'Total Entrants',
    'Source Cell Ref'
  ];

  const rows = records.map((r) => [
    r.id,
    r.year,
    r.program,
    r.department,
    r.mode,
    r.campus || 'Main Campus',
    r.male ?? 0,
    r.female ?? 0,
    r.total ?? 0,
    r.sourceCell || ''
  ]);

  const safeSheet = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;

  if (mode === 'overwrite') {
    // Clear sheet first
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${safeSheet}!A1:Z5000:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const valueData = [headers, ...rows];
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${safeSheet}!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${safeSheet}!A1`,
          majorDimension: 'ROWS',
          values: valueData
        })
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Error updating Google Sheet: ${err}`);
    }
  } else {
    // Append rows
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${safeSheet}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${safeSheet}!A1`,
          majorDimension: 'ROWS',
          values: rows
        })
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.text();
      throw new Error(`Error appending to Google Sheet: ${err}`);
    }
  }
};

/**
 * Fetch sheet titles for a given Spreadsheet ID so we don't assume "Sheet1"
 */
export const getSpreadsheetMetadata = async (
  token: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Google Sheet';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');
  return { title, sheets };
};

/**
 * Read student records from a Google Sheet to import into the application
 */
export const importRecordsFromGoogleSheet = async (
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<Partial<RecordItem>[]> => {
  const safeSheet = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${safeSheet}!A1:J1000`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to read sheet data: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length < 2) {
    return [];
  }

  // Row 0 is header. Match column indexes if possible
  const headerRow = rows[0].map((h: any) => String(h).toLowerCase().trim());
  
  const getIdx = (keywords: string[], defaultIdx: number) => {
    const found = headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));
    return found !== -1 ? found : defaultIdx;
  };

  const idxYear = getIdx(['year', 'academic'], 1);
  const idxProgram = getIdx(['program', 'level', 'degree'], 2);
  const idxDept = getIdx(['dept', 'department', 'faculty'], 3);
  const idxMode = getIdx(['mode', 'study'], 4);
  const idxCampus = getIdx(['campus', 'location'], 5);
  const idxMale = getIdx(['male'], 6);
  const idxFemale = getIdx(['female'], 7);
  const idxTotal = getIdx(['total'], 8);

  const importedRecords: Partial<RecordItem>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const yearNum = parseInt(row[idxYear]) || new Date().getFullYear();
    const program = String(row[idxProgram] || '1st Degree (Applied)').trim();
    const dept = String(row[idxDept] || 'General').trim();
    const mode = String(row[idxMode] || 'Regular').trim();
    const campus = row[idxCampus] ? String(row[idxCampus]).trim() : 'Batu Main Campus';
    const male = parseInt(row[idxMale]) || 0;
    const female = parseInt(row[idxFemale]) || 0;
    const total = parseInt(row[idxTotal]) || (male + female);

    importedRecords.push({
      year: yearNum,
      program: program,
      department: dept,
      mode: mode,
      campus: campus,
      male: male,
      female: female,
      total: total,
      sourceCell: `G-Sheet R${i + 1}`
    });
  }

  return importedRecords;
};
