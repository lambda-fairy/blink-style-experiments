# Blink style experiments

## Setting up

1. [Check out and build Chromium.](https://www.chromium.org/developers/how-tos/get-the-code)

2. [Install Node.js.](https://nodejs.org/en/)

3. Install R:

    + On Goobuntu, `sudo apt-get install r-google`.

    + Otherwise, install from the [R project site](https://www.r-project.org/).

4. [Install Pandoc.](https://github.com/jgm/pandoc/releases/latest)

    + This is used to generate HTML reports.

5. Install R dependencies:

    + `R -e install.packages("rmarkdown", "ggplot2", "nnls")`

6. Install Node.js dependencies:

    + `npm install`

    + `node -e 'require("erlenmeyer")' && echo OK`



## Running the experiments

Run `./collect.sh` to start the experiment. Data will be stored in the `traces/` directory.

Run `./process.sh` to mush these traces into a CSV file.


## Compiling the report

Run `R -e 'rmarkdown::render("report.Rmd")'` to compile the report. This should result in two files: `report.md` and `report.html`. The HTML file can be viewed in your favorite browser.
