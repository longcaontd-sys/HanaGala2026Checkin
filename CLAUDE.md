# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

QR check-in page for the Hana Gala 2026 event, used by organizer staff (BTC, "Ban Tổ Chức"). The whole app is a single static file, `index.html` (vanilla HTML/CSS/JS, UI text in Vietnamese). There is no build, package manager, lint, or test setup; to try it, open `index.html` in a browser with a `?token=...` query string. It is likely served from GitHub Pages (remote: `longcaontd-sys/HanaGala2026Checkin`), so pushing to `main` probably deploys it.

## Architecture / flow

1. A guest's QR code encodes a URL like `index.html?token=<base64url>`. The token decodes (URL-safe base64, padding restored) to `"<SECRET_KEY>_<guestId>"`; `decodeToken` rejects tokens whose prefix isn't `SECRET_KEY` (`"HANA2026"`). Any tool that generates QR codes must use this same format.
2. Staff devices are authorized by **device ID**, not a password. On first load the page generates a random ID (`BTC-XXXX-XXXX`) and stores it in `localStorage` under `BTC_DEVICE_ID`. Clearing site data or switching browser gives the device a new ID. Admins allow a device by adding its ID to the **"Thiết bị BTC"** tab of the spreadsheet (column A = ID, column C = "allowed" checkbox).
3. `processCheckin` calls the Google Apps Script Web App (`SCRIPT_URL`, must be the `/exec` URL) via **JSONP**: it injects a `<script>` tag with `?id=&device=&callback=handleResponse`. That is why the response handler must stay a global function named `handleResponse`.
4. `handleResponse` expects `{status: "success", id, name, table}`, `{status: "unauthorized"}` (shows "Không có quyền check-in" plus the device ID so staff can send it to an admin), or any other status with a `message` that is shown as an error.

## Backend (Google Apps Script + Sheets)

- Spreadsheet "Check-in Gala Hana 2026" (ID `1hP3aHzIXTt5HfYp_AfpKXzc--Z9r2JVKrqFgadT_1G4`). Tabs: `Checkin GD 15/11` and `Checkin GALA` (guest lists: Id, Họ và tên, Bàn, Checkin, Thời gian, Cho phép Checkin, …; event settings sit in row 2, cols E–G), `Trang tính2` (source list), `Thiết bị BTC` (allowed devices). Don't reorder tabs; the script may look them up by position.
- `apps-script/checkin.gs` is a copy of the script's `doGet` + `isDeviceAllowed`. The live script (bound to the spreadsheet) also has QR/ticket generators (`encodeID`, `taoVakXuatMaQRVaoDrive`, `xuatVeAnhChoMoiNguoi`) that are deliberately kept out of this public repo. Changes here must be pasted into the Apps Script editor by the user and redeployed as a **new version** before `/exec` picks them up.
- `doGet` uses `getActiveSheet()`, which in a web app is always the **first tab**. The tab being checked in against is whichever is first (currently `Checkin GD 15/11`); `F2` on that tab gates check-in, and column D (`Checkin`) is set to TRUE on success.
- The `id`/`device`/`callback` contract is shared between `index.html` and the script; change both together. Calling `/exec` with a real guest ID performs a real check-in, so don't hit it for testing; test the page by calling `handleResponse({...})` from the console.
