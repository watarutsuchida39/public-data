// 必要なパッケージ: geojson-vt, vt-pbf, @mapbox/tilebelt, node-fetch
// npm install geojson-vt vt-pbf @mapbox/tilebelt node-fetch

const http = require('http');
const url = require('url');
const tilebelt = require('@mapbox/tilebelt');
const geojsonvt = require('geojson-vt');
const vtpbf = require('vt-pbf');
const fetch = require('node-fetch');

let tileIndex = null;

// 初回にGeoJSONを取得してインデックス作成
async function loadGeoJSON(sourceUrl) {
  const res = await fetch(sourceUrl);
  const geojson = await res.json();
  tileIndex = geojsonvt(geojson, {
    maxZoom: 14,
    indexMaxZoom: 14,
    indexMaxPoints: 0
  });
  console.log('GeoJSONインデックス生成完了');
}

// タイル出力
function serveTile(z, x, y, res) {
  const tile = tileIndex.getTile(+z, +x, +y);
  if (!tile) {
    res.writeHead(204);
    return res.end();
  }

  const pbf = vtpbf({ 'layer0': tile });
  res.writeHead(200, { 'Content-Type': 'application/x-protobuf' });
  res.end(pbf);
}

// サーバー起動
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const match = parsed.pathname.match(/\/tile\/(\d+)\/(\d+)\/(\d+)\.pbf$/);

  if (match) {
    if (!tileIndex) {
      res.writeHead(503);
      return res.end('タイル未ロード');
    }
    const [_, z, x, y] = match;
    return serveTile(z, x, y, res);
  }

  if (parsed.pathname === '/load' && parsed.query.url) {
    try {
      await loadGeoJSON(parsed.query.url);
      res.writeHead(200);
      res.end('GeoJSONロード成功');
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end('GeoJSON取得失敗');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});