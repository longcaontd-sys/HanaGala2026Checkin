/**
 * Apps Script backend cho trang check-in (bản dùng ID thiết bị thay cho mật khẩu).
 *
 * CÁCH CẬP NHẬT:
 *   1. Google Sheet → Extensions → Apps Script.
 *   2. Xoá hàm doGet cũ, dán toàn bộ file này vào (giữ nguyên các hàm khác như
 *      encodeID, taoVakXuatMaQRVaoDrive, xuatVeAnhChoMoiNguoi).
 *   3. Deploy → Manage deployments → ✏️ Edit → Version: "New version" → Deploy.
 *      (Không tạo version mới thì URL /exec vẫn chạy code cũ.)
 *
 * Quyền check-in lấy từ tab "Thiết bị BTC":
 *   cột A = ID thiết bị (vd BTC-6KYQ-BD7X), cột C = ô tick "Cho phép".
 *
 * Lưu ý: getActiveSheet() trong Web App luôn trả về TAB ĐẦU TIÊN của file.
 * Tab đang được check-in là tab nằm đầu tiên → đừng kéo tab "Thiết bị BTC" lên đầu.
 */

var DEVICE_SHEET_NAME = 'Thiết bị BTC';

function doGet(e) {
  var id = e.parameter.id;
  var device = e.parameter.device; // ID thiết bị gửi lên từ trang check-in
  var callback = e.parameter.callback;
  var result;

  // 1. Kiểm tra thiết bị có quyền check-in không
  if (!isDeviceAllowed(device)) {
    result = { status: "unauthorized", message: "Không có quyền check-in", device: device || "" };
  }
  else if (!id) {
    result = { status: "error", message: "Mã QR không hợp lệ!" };
  }
  else {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 2. Kiểm tra cổng check-in đã mở chưa (ô F2 "Cho phép Checkin")
    var isCheckinAllowed = sheet.getRange("F2").getValue();
    if (isCheckinAllowed == false) {
      result = {
        status: "not_started",
        message: "Cổng check-in chưa mở!"
      };
    } else {
      // 3. Xử lý Check-in
      var data = sheet.getDataRange().getValues();
      var found = false;
      var name = "";
      var table = "";

      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() === id.toString().trim()) {
          sheet.getRange(i + 1, 4).setValue(true); // Tích TRUE vào cột D (Checkin)
          name = data[i][1]; // Họ tên ở cột B
          table = data[i][2]; // Bàn ở cột C
          found = true;
          break;
        }
      }

      if (found) {
        result = { status: "success", id: id, name: name, table: table };
      } else {
        result = { status: "not_found", message: "Không tìm thấy mã ID: " + id + " trong hệ thống!" };
      }
    }
  }

  // Trả về dữ liệu dạng JSONP
  if (callback) {
    var jsonpOutput = callback + "(" + JSON.stringify(result) + ");";
    return ContentService.createTextOutput(jsonpOutput)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Trả về true nếu ID thiết bị có trong tab "Thiết bị BTC" và ô "Cho phép" (cột C) được tick.
function isDeviceAllowed(deviceId) {
  if (!deviceId) return false;
  var wanted = String(deviceId).trim().toUpperCase();

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEVICE_SHEET_NAME);
  if (!sheet) return false;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); // cột A..C
  for (var i = 0; i < rows.length; i++) {
    var rowId = String(rows[i][0]).trim().toUpperCase();
    var allowed = rows[i][2] === true || String(rows[i][2]).toUpperCase() === 'TRUE';
    if (rowId && rowId === wanted && allowed) return true;
  }
  return false;
}
