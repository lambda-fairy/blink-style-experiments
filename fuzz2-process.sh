#!/bin/sh

for json_input in fuzz2-tests/*
do
    experiment_name="$(basename "$json_input" .json)"
    output_dir="traces/$experiment_name"
    > "fuzz2-$experiment_name.csv" \
        node_modules/erlenmeyer/erlnmyr fuzz2-process.erlnmyr \
        --input="$output_dir" --xvariable="$experiment_name"
done
