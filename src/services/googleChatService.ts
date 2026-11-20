import { RecordItem, ReportDocument, LIVE_PORTAL_URL } from '../types';

export interface ChatSpace {
  name: string; // e.g. "spaces/AAAAAAAAAAA"
  displayName?: string;
  type?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  spaceType?: string;
}

export interface ChatMessage {
  name?: string;
  text: string;
  createTime?: string;
}

const PROJECT_ID = 'southern-dogfish-gw1rw';
export const CHAT_APP_CONSOLE_URL = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${PROJECT_ID}`;

/**
 * List Google Chat Spaces accessible by the authenticated user
 */
export const listGoogleChatSpaces = async (token: string): Promise<ChatSpace[]> => {
  const response = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=50', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 404 || errText.includes('Google Chat app not found')) {
      throw new Error(
        `GOOGLE_CHAT_APP_NOT_CONFIGURED: Google Chat app is not configured in Cloud Console. Please configure your Chat app at: ${CHAT_APP_CONSOLE_URL}`
      );
    }
    throw new Error(`Failed to list Google Chat spaces: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.spaces || [];
};

/**
 * Send a message to a Google Chat Space
 */
export const sendGoogleChatMessage = async (
  token: string,
  spaceName: string,
  text: string
): Promise<ChatMessage> => {
  const response = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 404 || errText.includes('Google Chat app not found')) {
      throw new Error(
        `GOOGLE_CHAT_APP_NOT_CONFIGURED: Google Chat app is not configured in Cloud Console. Please configure your Chat app at: ${CHAT_APP_CONSOLE_URL}`
      );
    }
    throw new Error(`Failed to send message to Google Chat: ${response.status} ${errText}`);
  }

  return await response.json();
};

/**
 * Format and send an institutional report summary card to Google Chat
 */
export const sendReportSummaryToGoogleChat = async (
  token: string,
  spaceName: string,
  report: ReportDocument,
  totalStudents: number,
  departmentCount: number,
  femalePercentage: number
): Promise<ChatMessage> => {
  const messageText = 
`🏛️ *OROMIA STATE UNIVERSITY · INSTITUTIONAL REPORT DISPATCH*
📋 *Report Title:* ${report.name}
📅 *Date:* ${report.date} | *Status:* ${report.status}
✍️ *Prepared By:* ${report.preparedBy}

📊 *Key Performance Highlights:*
• *Total Active Student Entrants:* ${totalStudents.toLocaleString()}
• *Academic Departments Covered:* ${departmentCount}
• *Overall Female Student Share:* ${femalePercentage.toFixed(1)}%

📌 *Key Findings & Observations:*
${(report.customFindings || []).slice(0, 3).map((f) => `• ${f}`).join('\n')}

🔗 *Central Live Portal:* ${LIVE_PORTAL_URL}`;

  return sendGoogleChatMessage(token, spaceName, messageText);
};
