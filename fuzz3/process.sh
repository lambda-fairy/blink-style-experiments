#!/bin/sh

[ -z "$ERLNMYR" ] && ERLNMYR=erlnmyr

for json_input in experiment-specs/*
do
    experiment_name="$(basename "$json_input" .json)"
    output_dir="traces/$experiment_name"
    > "summary-$experiment_name.csv" \
        $ERLNMYR process.erlnmyr \
        --input="$output_dir"
done
