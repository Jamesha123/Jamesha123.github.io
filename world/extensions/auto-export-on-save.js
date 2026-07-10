function isGameMap(fileName) {
  return fileName.endsWith(".tmx");
}

function exportForPhaser() {
  if (!tiled.projectFileName) {
    tiled.warn("Open world/portfolio.tiled-project before editing the map.");
    return;
  }

  var projectDir = FileInfo.path(tiled.projectFileName);
  var scriptPath = FileInfo.joinPath(projectDir, "scripts/export-map.py");
  var process = new Process();
  process.start("python", [scriptPath]);
  process.waitForFinished(-1);

  var stderr = process.readAllStderr();
  var stdout = process.readAllStandardOutput();
  if (process.exitCode() !== 0) {
    tiled.error("Phaser export failed:\n" + (stderr || stdout));
    return;
  }

  tiled.log((stdout || "Exported maps for Phaser.").trim());
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

tiled.log("Map auto-export enabled (Ctrl+S -> world.json).");
