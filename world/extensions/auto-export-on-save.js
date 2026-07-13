function isGameMap(fileName) {
  return fileName.endsWith(".tmx");
}

function runExportScript(scriptPath) {
  var commands = ["py", "python3", "python"];
  var lastError = "";

  for (var index = 0; index < commands.length; index += 1) {
    var process = new Process();
    process.start(commands[index], [scriptPath]);
    process.waitForFinished(-1);

    var stderr = process.readAllStderr();
    var stdout = process.readAllStandardOutput();

    if (process.exitCode() === 0) {
      return {
        ok: true,
        command: commands[index],
        output: (stdout || stderr || "Exported maps for Phaser.").trim(),
      };
    }

    lastError = (stderr || stdout || "Unknown export error.").trim();
  }

  return {
    ok: false,
    output:
      "Phaser export failed. Install Python, then run:\n" +
      scriptPath +
      "\n\nLast error:\n" +
      lastError,
  };
}

function exportForPhaser() {
  if (!tiled.projectFileName) {
    tiled.warn("Open world/portfolio.tiled-project before editing the map.");
    return;
  }

  var projectDir = FileInfo.path(tiled.projectFileName);
  var scriptPath = FileInfo.joinPath(projectDir, "scripts/export-map.py");
  var result = runExportScript(scriptPath);

  if (!result.ok) {
    tiled.error(result.output);
    return;
  }

  tiled.log(result.output);
}

tiled.registerAction("ExportForPhaser", function () {
  exportForPhaser();
});
tiled.action("ExportForPhaser").text = "Export for Phaser";

tiled.assetSaved.connect(function (asset) {
  if (!asset.fileName) {
    return;
  }

  var fileName = FileInfo.fileName(asset.fileName);
  if (!isGameMap(fileName)) {
    return;
  }

  tiled.log("Map saved — exporting game maps...");
  exportForPhaser();
});

tiled.log("Map auto-export enabled. Save a .tmx to update world.json / house-interior.json.");
