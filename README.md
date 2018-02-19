
<p align="center">
    <img src ="/assets/icon.png" />
</p>
<!-- [![Augmentable](/assets/icon.png)](https://www.augmentable.io/) -->

# augmentable-cli

* [Overview](#overview)
* [Importing Data](#importing-data)

`npm install -g augmentable-cli`

- or -

`yarn add augmentable-cli --global`

## Overview

Augmentable CLI is a small command line utility for working with CSV and similarly structured text-based data files. It relies heavily on SQLite, and provides two primary utilities: importing data files into SQLite tables, and subsequent querying of those tables. It tries not to reinvent the wheel, and is designed to be comfortable to use and easy to integrate with scripts and other applications.


## Importing Data

CSVs are everywhere, but unfortunately are not always pleasant to query. Spreadsheets are easy to use, but can be clumsy and sometimes limiting. Custom scripts and python notebooks are versatile, but may be overkill for certain applications.

Augmentable is a set of tools designed to ease some of the pain involved in asking basic questions of text-based data. You can create a *project*, which is simply a SQLite database file in a special directory on your machine: `~/.augmentable`. You can then run an import process, specifying a CSV (or CSV-like) file and some parameters (delimiter, header row, etc) which will copy that file into a new or existing SQLite table.

- `augmentable projects:create myNewProject`
- `augmentable file:import /path/to/my/file.csv myNewProject myNewTable --header 0 -- delimiter ;`
- `augmentable sql:exec mynewProject 'SELECT * FROM myNewTable'`
