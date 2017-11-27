#!/usr/bin/env bash

./node_modules/.bin/serve -p 8080 &
SERVER_PID=$!

echo '--- Benchmark starting ---'

rm -rf benchmark-results

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 3 --headless true --framework vanillajs-non-keyed

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 3 --headless true --framework dojo2-v0.2.0-non-keyed

ls benchmark-results

node _build/tests/benchmark/runner/process-benchmark-results.js

function cleanup {
    kill $SERVER_PID
}

trap cleanup EXIT
