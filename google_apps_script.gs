// ============================================================
//  CRASHLAB CONTROL ROOM — MASTER APPS SCRIPT
//  Fixes: Login boolean crash, quiz options, phase3 merge,
//         IST dates, expanded sheet name matching, POST content-type
// ============================================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ss.getSheets().map(s => s.getName());

  // Performance optimization: return only team data for login verification
  const type = e && e.parameter && e.parameter.type;
  if (type === "teams_only") {
    const teamsData = getSheetData(ss, findSheet(sheetNames, ["team"]));
    return ok({ teams: teamsData });
  }

  // ── Fetch all tabs ─────────────────────────────────────────
  const teamsData       = getSheetData(ss, findSheet(sheetNames, ["team"]));
  const phase1Data      = getSheetData(ss, findSheet(sheetNames, ["phase_1_quiz", "phase_1", "phase1_quiz", "phase1"]));
  const phase2Data      = getSheetData(ss, findSheet(sheetNames, ["phase_2_reports", "phase_2_report", "phase2_report", "phase2"]));
  const phase3Finals    = getSheetData(ss, findSheet(sheetNames, ["phase_3_finals", "phase3_finals", "finals"]));
  const phase3Schedules = getSheetData(ss, findSheet(sheetNames, ["phase_3_schedules", "phase3_schedules", "schedules"]));
  const configRaw       = getSheetData(ss, findSheet(sheetNames, ["app_config", "config"]));
  // Broad matching: quiz_questions, questions, question, mcq, quiz (in that priority order)
  const questionsRaw    = getSheetData(ss, findSheet(sheetNames, ["quiz_questions", "questions", "question", "mcq", "quiz"]));
  const evidenceRaw     = getSheetData(ss, findSheet(sheetNames, ["phase_2_evidence", "phase2_evidence", "evidence"]));

  // ── Normalize question option columns ──────────────────────
  // Renames A/B/C/D → Option_A/B/C/D so the website always gets consistent keys
  const questions = questionsRaw.map(q => {
    const { Correct_Answer, ...rest } = q;
    const normalized = { ...rest };
    ["A", "B", "C", "D"].forEach(letter => {
      if (normalized[letter] !== undefined && normalized["Option_" + letter] === undefined) {
        normalized["Option_" + letter] = normalized[letter];
        delete normalized[letter];
      }
    });
    return normalized;
  });

  // ── Parse config as a key-value map ────────────────────────
  const config = {};
  configRaw.forEach(row => {
    const key = val(row, "Setting_Key");
    if (key) {
      config[key] = val(row, "Value");
    }
  });

  // ── Tie-breaker sorting (Phase 1) ──────────────────────────
  // Highest Score first, then lowest time taken
  const sortedPhase1 = phase1Data.map(row => {
    return {
      Team_ID: val(row, "Team_ID"),
      Score: Number(val(row, "Score")) || 0,
      Time_Taken: val(row, "Time_Taken"),
      Warnings: Number(val(row, "Warnings")) || 0,
      Qualified: val(row, "Qualified")
    };
  }).sort((a, b) => {
    if (b.Score !== a.Score) {
      return b.Score - a.Score;
    }
    // Parse time like "15m 30s" to seconds
    const secA = parseTimeToSeconds(a.Time_Taken);
    const secB = parseTimeToSeconds(b.Time_Taken);
    return secA - secB;
  });

  // ── Sorting Phase 2 ────────────────────────────────────────
  // Sort by Judge_Score descending
  const sortedPhase2 = phase2Data.map(row => {
    const judgeScore = val(row, "Judge_Score");
    return {
      Team_ID: val(row, "Team_ID"),
      Report_Link: val(row, "Report_Link") || val(row, "Report_URL"),
      Judge_Score: judgeScore !== "" ? Number(judgeScore) : "",
      Judge_Comments: val(row, "Judge_Comments"),
      Finalist: val(row, "Finalist"),
      Status: judgeScore !== "" && judgeScore !== null ? "REVIEWED" : "EVALUATING"
    };
  }).sort((a, b) => {
    const scoreA = a.Judge_Score !== "" ? Number(a.Judge_Score) : -1;
    const scoreB = b.Judge_Score !== "" ? Number(b.Judge_Score) : -1;
    return scoreB - scoreA;
  });

  // ── Phase 3 Merging & Sorting ──────────────────────────────
  // Merge Phase_3_Schedules (Presentation_Time, Location) into Phase_3_Finals by Team_ID
  const mergedPhase3 = phase3Finals.map(fRow => {
    const teamId = val(fRow, "Team_ID");
    const sched = phase3Schedules.find(sRow => val(sRow, "Team_ID") === teamId) || {};
    return {
      Team_ID: teamId,
      Score: val(fRow, "Score") !== "" ? Number(val(fRow, "Score")) : "",
      Final_Rank: val(fRow, "Final_Rank"),
      Presentation_Time: val(sched, "Presentation_Time") || val(sched, "Time") || "TBD",
      Location: val(sched, "Location") || val(sched, "Room") || "TBD"
    };
  }).sort((a, b) => {
    const scoreA = a.Score !== "" ? Number(a.Score) : -1;
    const scoreB = b.Score !== "" ? Number(b.Score) : -1;
    return scoreB - scoreA;
  });

  // ── Compile the response payload ──────────────────────────
  const responseData = {
    teams: teamsData,
    phase1: sortedPhase1,
    phase2: sortedPhase2,
    phase3: mergedPhase3,
    config: config,
    questions: questions,
    phase2Evidence: evidenceRaw
  };

  return ok(responseData);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetNames = ss.getSheets().map(s => s.getName());

    const action = payload.action;

    if (action === "VERIFY_VENUE") {
      const teamId = payload.team_id;
      const providedKey = payload.key;
      
      const configRaw = getSheetData(ss, findSheet(sheetNames, ["app_config", "config"]));
      const config = {};
      configRaw.forEach(row => {
        const key = val(row, "Setting_Key");
        if (key) config[key] = val(row, "Value");
      });
      
      const expectedVenueKey = config["venue_security_key"];
      if (!expectedVenueKey || expectedVenueKey.trim() === "") {
        return ok({ success: true, status: "BYPASSED" });
      }
      
      if (!providedKey || providedKey.trim().toUpperCase() !== expectedVenueKey.trim().toUpperCase()) {
        return ok({ success: false, error: "Invalid venue passcode" });
      }
      
      const teamSheetName = findSheet(sheetNames, ["team"]);
      if (!teamSheetName) {
        return ok({ success: false, error: "Team sheet not found" });
      }
      const sheet = ss.getSheetByName(teamSheetName);
      const values = sheet.getDataRange().getValues();
      const headers = values[0];
      
      let teamIdColIdx = -1;
      let statusColIdx = -1;
      
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i].trim().toLowerCase().replace(/[_\s]/g, "");
        if (h === "teamid") teamIdColIdx = i;
        else if (h === "status") statusColIdx = i;
      }
      
      if (teamIdColIdx === -1) {
        return ok({ success: false, error: "Team ID column not found" });
      }
      
      if (statusColIdx === -1) {
        statusColIdx = headers.length;
        sheet.getRange(1, statusColIdx + 1).setValue("Status");
      }
      
      let foundRowIndex = -1;
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][teamIdColIdx]).trim().toUpperCase() === String(teamId).trim().toUpperCase()) {
          foundRowIndex = i + 1;
          break;
        }
      }
      
      if (foundRowIndex === -1) {
        return ok({ success: false, error: "Team not found in database" });
      }
      
      sheet.getRange(foundRowIndex, statusColIdx + 1).setValue("ACTIVE");
      return ok({ success: true, status: "ACTIVE" });
    }

    if (action === "ELIMINATE_ABSENT_TEAMS") {
      const teamSheetName = findSheet(sheetNames, ["team"]);
      if (!teamSheetName) {
        return ok({ success: false, error: "Team sheet not found" });
      }
      const sheet = ss.getSheetByName(teamSheetName);
      const values = sheet.getDataRange().getValues();
      const headers = values[0];
      
      let teamIdColIdx = -1;
      let statusColIdx = -1;
      
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i].trim().toLowerCase().replace(/[_\s]/g, "");
        if (h === "teamid") teamIdColIdx = i;
        else if (h === "status") statusColIdx = i;
      }
      
      if (teamIdColIdx === -1) {
        return ok({ success: false, error: "Team ID column not found" });
      }
      
      if (statusColIdx === -1) {
        statusColIdx = headers.length;
        sheet.getRange(1, statusColIdx + 1).setValue("Status");
      }
      
      let eliminatedCount = 0;
      let activeCount = 0;
      
      for (var i = 1; i < values.length; i++) {
        const currentStatus = String(values[i][statusColIdx] || "").trim().toUpperCase();
        if (currentStatus !== "ACTIVE" && currentStatus !== "ELIMINATED") {
          sheet.getRange(i + 1, statusColIdx + 1).setValue("ELIMINATED");
          eliminatedCount++;
        } else if (currentStatus === "ACTIVE") {
          activeCount++;
        }
      }
      
      return ok({ success: true, eliminated_count: eliminatedCount, active_count: activeCount });
    }

    if (action === "SUBMIT_PHASE_2") {
      const teamId = payload.team_id;
      const reportUrl = payload.report_url;

      if (!teamId || !reportUrl) {
        return ok({ success: false, error: "Missing required fields" });
      }

      const rSheetName = findSheet(sheetNames, ["phase_2_reports", "phase_2_report", "phase2_report", "phase2"]);
      if (!rSheetName) {
        return ok({ success: false, error: "Phase 2 Reports sheet not found" });
      }
      const sheet = ss.getSheetByName(rSheetName);
      
      // Look if the team has already submitted a report to overwrite, or append a new one
      const data = getSheetData(ss, rSheetName);
      var values = sheet.getDataRange().getValues();
      var headers = values[0];
      var teamIdColIdx = -1;
      var reportLinkColIdx = -1;
      var timestampColIdx = -1;

      for (var i = 0; i < headers.length; i++) {
        var h = headers[i].trim().toLowerCase().replace(/[_\s]/g, "");
        if (h === "teamid") teamIdColIdx = i;
        else if (h === "reportlink" || h === "reporturl") reportLinkColIdx = i;
        else if (h === "timestamp") timestampColIdx = i;
      }

      if (teamIdColIdx === -1) teamIdColIdx = 1;
      if (reportLinkColIdx === -1) reportLinkColIdx = 2;
      if (timestampColIdx === -1) timestampColIdx = 0;

      var foundRowIndex = -1;
      for (var i = 1; i < values.length; i++) {
        if (values[i][teamIdColIdx] === teamId) {
          foundRowIndex = i + 1; // 1-indexed row number
          break;
        }
      }

      const timestamp = new Date();
      if (foundRowIndex !== -1) {
        // Overwrite existing report entry
        sheet.getRange(foundRowIndex, timestampColIdx + 1).setValue(timestamp);
        sheet.getRange(foundRowIndex, reportLinkColIdx + 1).setValue(reportUrl);
      } else {
        // Append new row mapping columns to headers length
        const newRow = new Array(headers.length).fill("");
        newRow[timestampColIdx] = timestamp;
        newRow[teamIdColIdx] = teamId;
        newRow[reportLinkColIdx] = reportUrl;
        sheet.appendRow(newRow);
      }

      return ok({ success: true });
    }

    if (action === "CHECK_IN") {
      const email = payload.email;
      if (!email) {
        return ok({ success: false, error: "Missing Email Address" });
      }

      // Normalize email: trim and lowercase
      const normalizedEmail = email.trim().toLowerCase();

      // Find the master_db sheet (fallback to first sheet in spreadsheet)
      var masterSheetName = findSheet(sheetNames, ["master_db", "master", "participants"]);
      var sheet;
      if (masterSheetName) {
        sheet = ss.getSheetByName(masterSheetName);
      } else {
        sheet = ss.getSheets()[0];
      }

      var values = sheet.getDataRange().getValues();
      if (values.length === 0) {
        return ok({ success: false, error: "NOT_FOUND" });
      }

      // Find which row contains the headers (looks for first row with "email")
      var headerRowIdx = 0;
      for (var r = 0; r < Math.min(values.length, 10); r++) {
        var row = values[r];
        var hasEmailCol = false;
        for (var c = 0; c < row.length; c++) {
          var valStr = String(row[c]).toLowerCase().trim();
          if (valStr.includes("email") || valStr === "registered email") {
            hasEmailCol = true;
            break;
          }
        }
        if (hasEmailCol) {
          headerRowIdx = r;
          break;
        }
      }

      var headers = values[headerRowIdx];

      // Find the Registered Email, Present, and Timestamp column indices
      var emailColIdx = -1;
      var presentColIdx = -1;
      var timestampColIdx = -1;
      var nameColIdx = -1;

      for (var i = 0; i < headers.length; i++) {
        var h = headers[i].trim().toLowerCase().replace(/[_\s-]/g, "");
        if (h === "registeredemail" || h === "email" || h === "registeredemailaddress") {
          emailColIdx = i;
        } else if (h === "present" || h === "checkin" || h === "attendance") {
          presentColIdx = i;
        } else if (h === "timestamp" || h === "time" || h === "checkintime") {
          timestampColIdx = i;
        } else if (h === "name" || h === "investigator" || h === "investigatorname" || h === "fullname" || h === "teamid") {
          nameColIdx = i;
        }
      }

      // If email column is not found, default to first column (column 0)
      if (emailColIdx === -1) {
        emailColIdx = 0;
        sheet.getRange(headerRowIdx + 1, 1).setValue("Registered Email");
        headers[0] = "Registered Email";
      }

      // Add new columns if missing: Present, Timestamp
      if (presentColIdx === -1) {
        presentColIdx = headers.length;
        sheet.getRange(headerRowIdx + 1, presentColIdx + 1).setValue("Present");
        headers[presentColIdx] = "Present";
      }
      if (timestampColIdx === -1) {
        timestampColIdx = sheet.getLastColumn();
        sheet.getRange(headerRowIdx + 1, timestampColIdx + 1).setValue("Timestamp");
        headers[timestampColIdx] = "Timestamp";
      }

      // Look up email starting from row after headers
      var foundRowIndex = -1;
      var nameVal = "";
      var isAlreadyPresent = false;

      for (var i = headerRowIdx + 1; i < values.length; i++) {
        var rowEmail = String(values[i][emailColIdx]).trim().toLowerCase();
        if (rowEmail === normalizedEmail) {
          foundRowIndex = i + 1; // 1-indexed row number
          var presentVal = String(values[i][presentColIdx] || "").trim().toUpperCase();
          if (presentVal === "YES" || presentVal === "TRUE" || presentVal === "Y") {
            isAlreadyPresent = true;
          }
          if (nameColIdx !== -1) {
            nameVal = String(values[i][nameColIdx]).trim();
          }
          break;
        }
      }

      var checkInTimestamp = new Date();
      var timeZone = "Asia/Kolkata";
      var formattedTimestamp = Utilities.formatDate(checkInTimestamp, timeZone, "dd-MMM-yyyy hh:mm a");

      if (foundRowIndex === -1) {
        // Append a new row recording the failed check-in attempt (NO)
        var checkInRow = new Array(headers.length).fill("");
        checkInRow[emailColIdx] = email;
        checkInRow[presentColIdx] = "NO";
        checkInRow[timestampColIdx] = formattedTimestamp;
        sheet.appendRow(checkInRow);

        return ok({ success: false, error: "NOT_FOUND" });
      }

      if (isAlreadyPresent) {
        return ok({ success: true, status: "ALREADY_CHECKED_IN", name: nameVal || "Investigator" });
      }

      // Update the row to YES
      sheet.getRange(foundRowIndex, presentColIdx + 1).setValue("YES");
      sheet.getRange(foundRowIndex, timestampColIdx + 1).setValue(formattedTimestamp);

      return ok({ 
        success: true, 
        status: "CHECKED_IN", 
        name: nameVal || "Investigator",
        timestamp: formattedTimestamp
      });
    }

    if (action === "GET_CHECKIN_STATS") {
      var masterSheetName = findSheet(sheetNames, ["master_db", "master", "participants"]);
      var sheet;
      if (masterSheetName) {
        sheet = ss.getSheetByName(masterSheetName);
      } else {
        sheet = ss.getSheets()[0];
      }

      var values = sheet.getDataRange().getValues();
      if (values.length === 0) {
        return ok({ success: true, checked_in: 0, total_registered: 0 });
      }

      // Find which row contains the headers
      var headerRowIdx = 0;
      for (var r = 0; r < Math.min(values.length, 10); r++) {
        var row = values[r];
        var hasEmailCol = false;
        for (var c = 0; c < row.length; c++) {
          var valStr = String(row[c]).toLowerCase().trim();
          if (valStr.includes("email") || valStr === "registered email") {
            hasEmailCol = true;
            break;
          }
        }
        if (hasEmailCol) {
          headerRowIdx = r;
          break;
        }
      }

      var headers = values[headerRowIdx];
      var emailColIdx = -1;
      var presentColIdx = -1;

      for (var i = 0; i < headers.length; i++) {
        var h = headers[i].trim().toLowerCase().replace(/[_\s-]/g, "");
        if (h === "registeredemail" || h === "email" || h === "registeredemailaddress") {
          emailColIdx = i;
        } else if (h === "present" || h === "checkin" || h === "attendance") {
          presentColIdx = i;
        }
      }

      if (emailColIdx === -1) {
        emailColIdx = 0;
      }

      var checkedIn = 0;
      var totalRegistered = 0;

      for (var i = headerRowIdx + 1; i < values.length; i++) {
        var emailVal = String(values[i][emailColIdx]).trim();
        if (emailVal !== "") {
          totalRegistered++;
          if (presentColIdx !== -1) {
            var presentVal = String(values[i][presentColIdx] || "").trim().toUpperCase();
            if (presentVal === "YES" || presentVal === "TRUE" || presentVal === "Y") {
              checkedIn++;
            }
          }
        }
      }

      return ok({
        success: true,
        checked_in: checkedIn,
        total_registered: totalRegistered
      });
    }

    // Default: Handling Phase 1 MCQ Quiz submission
    const teamId    = payload.team_id;
    const answers   = payload.answers || {};
    const timeTaken = payload.time_taken || "0m 0s";
    const warnings  = Number(payload.warnings) || 0;

    if (!teamId) {
      return ok({ success: false, error: "Missing Team_ID" });
    }

    const qSheetName = findSheet(sheetNames, ["quiz_questions", "questions", "question", "mcq", "quiz"]);
    const questionsRaw = getSheetData(ss, qSheetName);

    let earnedMarks = 0;
    const individualAnswers = [];

    questionsRaw.forEach(q => {
      const qId = val(q, "Q_ID");
      const correctAnswer = val(q, "Correct_Answer").trim().toUpperCase();
      const qMarks = Number(val(q, "Marks")) || 4;

      const userAnswer = String(answers[qId] || "SKIP").trim().toUpperCase();
      individualAnswers.push(qId + ":" + userAnswer);

      if (userAnswer === correctAnswer) {
        earnedMarks += qMarks;
      }
    });

    const totalPossible = questionsRaw.length * 4;
    const qualified = earnedMarks >= (totalPossible / 2);

    const quizSheetName = findSheet(sheetNames, ["phase_1_quiz", "phase_1", "phase1_quiz", "phase1"]);
    if (!quizSheetName) {
      return ok({ success: false, error: "Phase 1 Quiz sheet not found" });
    }
    const quizSheet = ss.getSheetByName(quizSheetName);
    const timestamp = new Date();
    const submittedAnswersString = individualAnswers.join(", ");

    var quizValues = quizSheet.getDataRange().getValues();
    var quizHeaders = quizValues[0];
    
    var qTimestampColIdx = -1;
    var qTeamIdColIdx = -1;
    var qScoreColIdx = -1;
    var qTimeColIdx = -1;
    var qWarningsColIdx = -1;
    var qQualifiedColIdx = -1;
    var qAnswersColIdx = -1;

    for (var i = 0; i < quizHeaders.length; i++) {
      var h = quizHeaders[i].trim().toLowerCase().replace(/[_\s]/g, "");
      if (h === "timestamp") qTimestampColIdx = i;
      else if (h === "teamid") qTeamIdColIdx = i;
      else if (h === "score") qScoreColIdx = i;
      else if (h === "timetaken" || h === "time") qTimeColIdx = i;
      else if (h === "warnings") qWarningsColIdx = i;
      else if (h === "qualified") qQualifiedColIdx = i;
      else if (h === "submittedanswers" || h === "answers") qAnswersColIdx = i;
    }

    if (qTimestampColIdx === -1) qTimestampColIdx = 0;
    if (qTeamIdColIdx === -1) qTeamIdColIdx = 1;
    if (qScoreColIdx === -1) qScoreColIdx = 2;
    if (qTimeColIdx === -1) qTimeColIdx = 3;
    if (qWarningsColIdx === -1) qWarningsColIdx = 4;
    if (qQualifiedColIdx === -1) qQualifiedColIdx = 5;

    const newRow = new Array(quizHeaders.length).fill("");
    newRow[qTimestampColIdx] = timestamp;
    newRow[qTeamIdColIdx] = teamId;
    newRow[qScoreColIdx] = earnedMarks;
    newRow[qTimeColIdx] = timeTaken;
    newRow[qWarningsColIdx] = warnings;
    newRow[qQualifiedColIdx] = qualified ? "TRUE" : "FALSE";
    if (qAnswersColIdx !== -1) {
      newRow[qAnswersColIdx] = submittedAnswersString;
    }
    
    quizSheet.appendRow(newRow);

    return ok({
      success: true,
      score: earnedMarks,
      total: totalPossible,
      correct: earnedMarks / 4,
      qualified: qualified
    });

  } catch (err) {
    return ok({ success: false, error: err.message });
  }
}

function findSheet(sheetNames, keywords) {
  for (var i = 0; i < keywords.length; i++) {
    var kw = keywords[i].toLowerCase().trim();
    var found = sheetNames.find(function(name) {
      return name.toLowerCase().includes(kw);
    });
    if (found) return found;
  }
  return undefined;
}

function getSheetData(ss, sheetName) {
  if (!sheetName) return [];
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows    = values.slice(1);
  return rows
    .filter(function(row) {
      return row.some(function(cell) { return cell !== "" && cell !== null; });
    })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        var cell = row[i];
        if (cell instanceof Date) {
          var timeZone = "Asia/Kolkata";
          if (cell.getFullYear() === 1899) {
            obj[h] = Utilities.formatDate(cell, timeZone, "hh:mm a");
          } else {
            obj[h] = Utilities.formatDate(cell, timeZone, "yyyy-MM-dd hh:mm a");
          }
        } else if (typeof cell === "boolean") {
          var cleanH = h.trim().toLowerCase().replace(/[_\s]/g, "");
          if (cleanH === "status") {
            obj[h] = cell ? "ACTIVE" : "LOCKED";
          } else if (cleanH === "qualified" || cleanH === "finalist") {
            obj[h] = cell ? "TRUE" : "FALSE";
          } else {
            obj[h] = cell ? "TRUE" : "FALSE";
          }
        } else {
          obj[h] = cell;
        }
      });
      return obj;
    });
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 999999;
  var minutes = 0;
  var seconds = 0;
  var minMatch = String(timeStr).match(/(\d+)\s*m/i);
  var secMatch = String(timeStr).match(/(\d+)\s*s/i);
  if (minMatch) minutes = parseInt(minMatch[1], 10);
  if (secMatch) seconds = parseInt(secMatch[1], 10);
  if (!minMatch && !secMatch) {
    if (String(timeStr).includes(":")) {
      var parts = String(timeStr).split(":");
      minutes = parseInt(parts[0], 10) || 0;
      seconds = parseInt(parts[1], 10) || 0;
    } else {
      seconds = parseInt(timeStr, 10) || 999999;
    }
  }
  return (minutes * 60) + seconds;
}

function val(entry, keyName) {
  if (!entry) return "";
  var clean = keyName.trim().toLowerCase().replace(/[_\s]/g, "");
  var found = Object.keys(entry).find(function(k) {
    return k.trim().toLowerCase().replace(/[_\s]/g, "") === clean;
  });
  return found !== undefined ? entry[found] : "";
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
