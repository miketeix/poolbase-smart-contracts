#!/usr/bin/env bash

rm -rf flats/*

./node_modules/.bin/truffle-flattener contracts/v2/PoolbaseCloneFactory.sol > flats/PoolbaseCloneFactory.sol
./node_modules/.bin/truffle-flattener contracts/v2/Poolbase.sol > flats/Poolbase.sol
./node_modules/.bin/truffle-flattener contracts/PoolbaseEventEmitter.sol > flats/PoolbaseEventEmitter.sol
./node_modules/.bin/truffle-flattener contracts/token/GustavoCoin.sol > flats/GustavoCoin.sol
