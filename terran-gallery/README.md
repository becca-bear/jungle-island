# Terran gallery assets

This directory contains a snapshot of the Terran gallery catalogue and the source modules it uses. `bundle.js` includes Three.js and is loaded only by the gallery; Jungle Island's game and assets are unchanged. The catalogue entry point is `entry.js`. To rebuild after editing the source, bundle that entry point as an IIFE named `TerranGallery` with esbuild and Three.js 0.170 installed.
