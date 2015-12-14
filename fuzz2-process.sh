#!/bin/sh

for variable in branchiness depthicity nodeCount
do
    > fuzz2-$variable.csv \
        node_modules/erlenmeyer/erlnmyr fuzz2-process.erlnmyr \
        --input=traces/fuzz2 --xvariable=$variable
done
