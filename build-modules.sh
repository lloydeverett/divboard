#!/bin/bash

set -euxo pipefail

cd parse
npm install
npm run build
cd ../collab
npm install
npm run build
cd ..

