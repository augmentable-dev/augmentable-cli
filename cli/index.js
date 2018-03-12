#!/usr/bin/env node

const package = require('../package.json')
const prog = require('caporal')
const path = require('path')
const fs = require('fs')

const { projectsPath } = require('../helpers')
const { projects, tables, file, sql } = require('./commands')

const { OPTIONS } = require('./constants')

if (!fs.existsSync(projectsPath)) {
    fs.mkdirSync(projectsPath)

    const configPath = path.join(projectsPath, 'augmentable.json')
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, '{}')
    }
}

require('console-png').attachTo(console)
const icon = fs.readFileSync(require.resolve('../assets/small-icon.png')) // eslint-disable-line no-unused-vars

prog
    .version(package.version)
    .help('augmentable is a tool for working with CSV/TSV or similar text-like data')
    
prog
    .command('projects:list', 'List projects. Projects are SQLite DB files, located in `/.augmentable` of your home directory.')
    .alias('projects')
    .option(...OPTIONS.SIMPLE_OUTPUT_OPTION)
    .action(projects.list)

prog
    .command('projects:create', 'Create a new project (SQLite DB), which new tables can be created in')
    .argument('[name]', 'Give this project a name')
    .action(projects.create)

prog
    .command('projects:delete', 'Remove a project. Deletes the underlying SQLite database file')
    .alias('projects:remove')
    .argument('[name]', 'The name of the project (use augmentable projects:list to determine), or don\'t specify to select from list')
    .action(projects.delete)

prog
    .command('projects:rename', 'Rename a project')
    .argument('[project]', 'The name of the project to rename')
    .argument('[newName]', 'The new name of the project')
    .action(projects.rename)

prog
    .command('projects:tables', 'List all the tables in a project')
    .argument('[project]', 'The name of the project to list the tables in')
    .option(...OPTIONS.SIMPLE_OUTPUT_OPTION)
    .action(projects.tables)

prog
    .command('tables:columns', 'List columns in a table.')
    .argument('[project]', 'The name of the project the table is in')
    .argument('[table]', 'Name of the table to list columns of')  
    .option(...OPTIONS.SIMPLE_OUTPUT_OPTION)
    .action(tables.columns)

prog
    .command('tables:drop', 'Drop a table in a project')
    .argument('[project]', 'The name of the project the table is in')
    .argument('[table]', 'Name of the table to drop')
    .action(tables.drop)

prog
    .command('file:import', 'Import a file into a new or existing table in a project')
    .argument('[filePath]', 'Path to CSV (or CSV like) file to import. Will be prompted if not specified')
    .argument('[projectName]', 'Name of the project to import into')
    .argument('[tableName]', 'Name of the table to import into. New table will be created if necessary')
    .option('--delimiter [delimiter]', 'Specify the column delimiter used in your import file (defaults to `,`)')
    .option('--header [header]', 'Specify either an integer indicating what line of your input file to use as a header, or a JSON string, such as \'["column_1", "column_2"]\'')
    .action(file.import)

prog
    .command('sql:exec', 'Execute a SQL statement')
    .argument('[projectName]', 'Project to execute the SQL on')
    .argument('[sql]', 'SQL statement to execute. Anything returned will be printed')
    .action(sql.exec)
    

prog.parse(process.argv)
