# Project Structure

## Frontend
- `index.html` - Landing page
- `apps.html` - Apps page
- `templates.html` - Templates catalog page
- `community.html` - Community app markup only
- `style.css` - Shared styles used by existing pages
- `assets/css/community.css` - Community page styles (extracted from `community.html`)
- `assets/js/community.js` - Community page logic (extracted from `community.html`)
- `logo1.png` - Brand image asset

## Backend (Google Apps Script source)
- `backend/community/Code.gs` - Community backend routes and sheet operations

## Notes
- If you redeploy Apps Script and get a new URL, update `SCRIPT_URL` inside `assets/js/community.js`.
- Keep only one `doGet` and one `doPost` in the Apps Script project.
