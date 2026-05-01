// ── GOOGLE CALENDAR MODULE ─────────────────────────────────────────────────
// Requires: manifest.json oauth2.client_id to be set and "identity" permission.

const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

function gcalGetToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive, scopes: [GCAL_SCOPE] }, token => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

function gcalSignOut() {
  return new Promise(resolve => {
    chrome.identity.getAuthToken({ interactive: false }, token => {
      if (!token) { resolve(); return; }
      chrome.identity.removeCachedAuthToken({ token }, () => {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
        resolve();
      });
    });
  });
}

async function fetchWeekEvents(weekMonday, token) {
  const timeMin = new Date(weekMonday);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(weekMonday);
  timeMax.setDate(timeMax.getDate() + 7);
  timeMax.setHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (resp.status === 401) throw new Error('auth');
  if (!resp.ok) throw new Error(`Calendar API error ${resp.status}`);
  const data = await resp.json();
  return data.items || [];
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mapEventsToSlots(events, weekMonday) {
  const result = {}; // slotKey -> string[]
  const base = new Date(weekMonday);
  base.setHours(0, 0, 0, 0);

  events.forEach(event => {
    if (event.status === 'cancelled') return;
    const title = (event.summary || '(No title)').trim();

    let startDate;
    let isAllDay = false;

    if (event.start.date) {
      isAllDay = true;
      const [y, m, d] = event.start.date.split('-').map(Number);
      startDate = new Date(y, m - 1, d);
    } else {
      startDate = new Date(event.start.dateTime);
    }

    const dayDiff = Math.round((startDate - base) / (1000 * 60 * 60 * 24));
    if (dayDiff < 0 || dayDiff > 6) return;

    let rowIndex;
    if (isAllDay) {
      rowIndex = 0;
    } else {
      const hour = startDate.getHours();
      if (hour < 12) rowIndex = 0;
      else if (hour < 17) rowIndex = 1;
      else rowIndex = 2;
    }

    const key = `${dayDiff}-${rowIndex}`;
    if (!result[key]) result[key] = [];
    result[key].push(title);
  });

  return result;
}
