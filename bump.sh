#!/bin/sh
# Version hochzählen: ./bump.sh 2
n="$1"; [ -z "$n" ] && echo "Aufruf: ./bump.sh <neue Version>" && exit 1
sed -i "s/?v=[0-9]*/?v=$n/g" index.html sw.js
sed -i "s/ablage-v[0-9]*/ablage-v$n/" sw.js
sed -i "s/const VER=[0-9]*/const VER=$n/" js/01-core.js
