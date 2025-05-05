// api/geojson-to-pbf-server.js - Vercel 用サーバレス関数

import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';

let tileIndex = null;

export default async function handler(req, res) {
  const { url, z, x, y } = req.query;

  try {
    if (req.method === 'GET' && url && !tileIndex) {
      const response = await fetch(url);
      const geojson = await response.json();
      tileIndex = geojsonvt(geojson);
      return res.status(200).json({ message: 'Tile index created' });
    }

    if (tileIndex && z && x && y) {
      const tile = tileIndex.getTile(+z, +x, +y);
      if (!tile) return res.status(204).end();
      const pbf = vtpbf({ layer0: tile });
      res.setHeader('Content-Type', 'application/x-protobuf');
      return res.status(200).send(Buffer.from(pbf));
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
