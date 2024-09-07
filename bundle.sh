#!/bin/bash

set -euxo pipefail

rm -rf ./dist
npm run build
cd dist
perl -pi -e 's/\/assets\//\//g' index.html
mv ./assets/* .
rm -rf ./assets
cd ..

