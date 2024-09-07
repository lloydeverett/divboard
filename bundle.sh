#!/bin/bash

set -euxo pipefail

rm -rf ./dist
npm install
npm run build
cd dist
perl -pi -e 's/\/assets\//\//g' index.html
mv ./assets/* .
rm -rf ./assets
cp -r ../*.png ../*.xml ../*.ico ../*.svg ../*.webmanifest ../fonts .
cd ..

