#!/usr/bin/env node

const package = require('./package.json')
const prog = require('caporal')
const path = require('path')
const os = require('os')
const fs = require('fs')
const fg = require('fast-glob')
const ora = require('ora')
const Table = require('cli-table2')
const inquirer = require('inquirer')
const csvSQLite = require('csv-sqlite')
const moment = require('moment')
const numbro = require('numbro')
const chalk = require('chalk')
const projectsPath = path.join(os.homedir(), '.augmentable')


if (!fs.existsSync(projectsPath)) {
    fs.mkdirSync(projectsPath)

    const configPath = path.join(projectsPath, 'augmentable.json')
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, '{}')
    }
}

require('console-png').attachTo(console);
const icon = fs.readFileSync(require.resolve('./assets/small-icon.png'))

const projectFiles = fg.sync(['*.sqlite'], {
    cwd: projectsPath,
    stats: true
})

prog
    .version(package.version)
    .help('augmentable is a tool for working with CSV/TSV or similar text-like data')
    
prog
    .command('projects:list', 'List projects. Projects are SQLite DB files, located in `/.augmentable` of your home directory.')
    .alias('projects')
    .option('--simple-output', 'Display projects in a csv list', prog.BOOL)
    .action(function(args, options, logger) {
        if (options.simpleOutput) {
            // if --simple-output is passed, log the results as CSV, potentially to be consumed by another application / script
            logger.info([
                'Project Name',
                'File Path',
                'Created',
                'Modified',
                'File Size (bytes)'
            ].join(','))
            projectFiles.forEach(p => {
                const birthTime = (new Date(p.birthtime));
                const modTime = (new Date(p.mtime))
                logger.info([
                    path.basename(p.path, '.sqlite'),
                    path.resolve(projectsPath, p.path),
                    birthTime,
                    modTime,
                    p.size
                ].join(','))
            })
        }
        else {
            // otherwise, log it as a more readable table
            const table = new Table({
                head: ['Project', 'Created', 'Modified', 'File size '],
                style: {
                    head: []
                }
            })
            projectFiles.forEach(p => {
                const birthTime = moment(new Date(p.birthtime));
                const modTime = moment(new Date(p.mtime))
                table.push([
                    path.basename(p.path, '.sqlite'),
                    `${birthTime.format('YYYY-MM-DD hh:mma')}, ${modTime.fromNow()}`,
                    `${modTime.format('YYYY-MM-DD hh:mma')}, ${modTime.fromNow()}`,
                    numbro(p.size).format('0.0 bd')
                ])
            })
            logger.info(table.toString())
        }
    })

prog
    .command('projects:create', 'Create a new project (SQLite DB), which new tables can be created in')
    .argument('[name]', 'Give this project a name')
    .action(async function(args, options, logger) {
        let projectName = args.name
        
        if (!projectName) {
            pn  = await inquirer.prompt({
                type: 'input',
                name: 'projectName',
                message: 'Project name'
            })
            projectName = pn.projectName
        }
        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)

        const spinner = ora('Creating project').start()
        if (fs.existsSync(dbFilePath)) {
            spinner.fail('Project with this name already exists')
            return
        }
        csvSQLite.createDB(dbFilePath)
        spinner.succeed(`Project ${projectName} created.`)
    })

prog
    .command('projects:delete', 'Remove a project. Deletes the underlying SQLite database file')
    .alias('projects:remove')
    .argument('[name]', `The name of the project (use augmentable projects:list to determine), or don't specify to select from list`)
    .action(async function(args, options, logger) {
        let projectName = args.name
        if (!projectName) {
            pn  = await inquirer.prompt([{
                type: 'list',
                name: 'projectName',
                message: 'Select Project',
                choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
            }])
            projectName = pn.projectName
        }
        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)

        c = await inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure? This will remove the SQLite database file and is irreversible`
        })

        const spinner = ora('Removing project').start()

        if (!c.confirm) {
            spinner.fail('Cancelled')
            return
        }

        if (!fs.existsSync(dbFilePath)) {
            spinner.fail(`Could not find project ${projectName}`)
            return
        }
        await csvSQLite.removeDB(dbFilePath)
        spinner.succeed(`Removed project ${projectName}.`)
    })

prog
    .command('projects:rename', 'Rename a project')
    .argument('[project]', 'The name of the project to rename')
    .argument('[newName]', 'The new name of the project')
    .action(async function(args, options, logger) {
        let projectName = args.project
        let newName = args.newName
        if (!projectName) {
            pn  = await inquirer.prompt([{
                type: 'list',
                name: 'projectName',
                message: 'Select Project',
                choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
            }])
            projectName = pn.projectName
        }

        if (!newName) {
            nn  = await inquirer.prompt({
                type: 'input',
                name: 'newName',
                message: 'New name'
            })
            newName = nn.newName
        }

        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
        const newDbFilePath = path.join(projectsPath, `${newName}.sqlite`)
        const spinner = ora('Renaming project').start()
        if (!fs.existsSync(dbFilePath)) {
            spinner.fail(`Could not find project ${projectName}`)
            return
        }
        fs.renameSync(dbFilePath, newDbFilePath)
        spinner.succeed(`Renamed project ${projectName} -> ${newName}.`)
    })

prog
    .command('projects:tables', 'List all the tables in a project')
    .argument('[project]', 'The name of the project to list the tables in')
    .option('--simple-output', 'Display tables in a csv list', prog.BOOL)
    .action(async function(args, options, logger) {
        let projectName = args.project
        if (!projectName) {
            pn  = await inquirer.prompt([{
                type: 'list',
                name: 'projectName',
                message: 'Select Project',
                choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
            }])
            projectName = pn.projectName
        }
        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
        const tables = csvSQLite.prepare(dbFilePath, `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)

        if (!fs.existsSync(dbFilePath)) {
            spinner.fail(`Could not find project ${projectName}`)
            return
        }

        tables.forEach(async t => {
            const tableInfo = csvSQLite.prepare(dbFilePath, `PRAGMA table_info(${t.name})`)
            t.info = tableInfo
        })

        if (options.simpleOutput) {
            logger.info([
                'Table Name',
                'Columns'
            ].join(','))
            tables.forEach(t => {
                logger.info([
                    t.name,
                    t.info.length
                ].join(','))
            })
        }
        else {
            const table = new Table({
                head: ['Table Name', 'Columns'],
                style: {
                    head: []
                }
            })
            tables.forEach(t => {
                table.push([
                    t.name,
                    t.info.length
                ])
            })
            logger.info(table.toString())
        }
    })

prog
    .command('tables:drop', 'Drop a table in a project')
    .argument('[project]', 'The name of the project the table is in')
    .argument('[table]', 'Name of the table to drop')
    .action(async function(args, options, logger) {
        let projectName = args.project
        if (!projectName) {
            pn  = await inquirer.prompt([{
                type: 'list',
                name: 'projectName',
                message: 'Select Project',
                choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
            }])
            projectName = pn.projectName
        }
        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
        const tables = csvSQLite.prepare(dbFilePath, `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
        let tableName = args.table
        if (!tableName) {
            tn = await inquirer.prompt([{
                type: 'list',
                name: 'tableName',
                message: 'Table',
                choices: tables.map(t => t.name)
            }])
            tableName = tn.projectName
        }
    
        const spinner = ora('Removing table').start()
        csvSQLite.removeTable(dbFilePath, tableName)
        spinner.succeed(`Table ${tableName} dropped`)
    })

prog
    .command('file:import', 'Import a file into a new or existing table in a project')
    .argument('[filePath]', 'Path to CSV (or CSV like) file to import. Will be prompted if not specified')
    .argument('[projectName]', 'Name of the project to import into')
    .argument('[tableName]', 'Name of the table to import into. New table will be created if necessary')
    .option('--delimiter [delimiter]', 'Specify the column delimiter used in your import file (defaults to `,`)')
    .option('--header [header]', `Specify either an integer indicating what line of your input file to use as a header, or a JSON string, such as '["column_1", "column_2"]'`)
    .action(async function(args, options, logger) {
        let {filePath, projectName, tableName} = args
        if (!filePath) {
            fp  = await inquirer.prompt({
                type: 'input',
                name: 'filePath',
                message: 'File path (relative to CWD or absolute)'
            })
            filePath = fp.filePath
        }
        if (!projectName) {
            pn  = await inquirer.prompt({
                type: 'list',
                name: 'projectName',
                message: `Name of project to use (will create if one doesn't exist`,
                choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
            })
            projectName = pn.projectName
        }
        if (!tableName) {
            tn  = await inquirer.prompt({
                type: 'input',
                name: 'tableName',
                message: 'Name of table to import into (existing or new)'
            })
            tableName = tn.tableName
        }

        if (!fs.existsSync(filePath)) logger.error('Could not find import file')

        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)

        await csvSQLite.importFromFile(dbFilePath, filePath, tableName, 0)
    })

prog
    .command('sql:exec', 'Execute a SQL statement')
    .argument('[projectName]', 'Project to execute the SQL on')
    .argument('[sql]', 'SQL statement to execute. Anything returned will be printed')
    .action(async function(args, options, logger) {
        let projectName = args.projectName
        if (!projectName) {
            pn  = await inquirer.prompt([{
                type: 'list',
                name: 'projectName',
                message: 'Select Project',
                choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
            }])
            projectName = pn.projectName
        }

        const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)        

        let sql = args.sql
        if (!sql) {
            s = await inquirer.prompt({
                type: 'input',
                name: 'sql',
                message: 'SQL'
            })
            sql = s.sql
        }
        let rows;
        try {
            rows = csvSQLite.iterate(dbFilePath, sql)
            let header = false
            for (const r of rows) {
                if (!header) {
                    logger.info(Object.keys(r).join(','))
                    header = true
                }
                logger.info(Object.values(r).join(','))
            }
        }
        catch(e) {
            rows = csvSQLite.run(dbFilePath, sql)
        }
    })
    
prog
    .command('tables:columns', 'List columns in a table.')
    .argument('[project]', 'The name of the project the table is in')
    .argument('[table]', 'Name of the table to list columns of')  
    .option('--simple-output', 'Display columns in a csv list', prog.BOOL)  
    .action(async function(args, options, logger) {
      let projectName = args.project
      if (!projectName) {
          pn  = await inquirer.prompt([{
              type: 'list',
              name: 'projectName',
              message: 'Select Project',
              choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
          }])
          projectName = pn.projectName
      }
      
      let tableName = args.table
      if (!tableName) {
          pn  = await inquirer.prompt({
              type: 'input',
              name: 'tableName',
              message: 'Table name'
          })
          tableName = pn.tableName
          if (!tableName){
              logger.info("No Table name provided");
              return;
          }
      }
      
      const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
      
      const tableInfo = csvSQLite.prepare(dbFilePath, `PRAGMA table_info(${tableName})`)
      
      if (!tableInfo.length){
        logger.info("Table not found");
        return;
      }
      
      if (options.simpleOutput) {
          logger.info([
              'Column Name',
              'Column Type'
          ].join(','))
          tableInfo.forEach(column => {
              logger.info([
                  column.name,
                  column.type
              ].join(','))
          })
      }
      else {
          const table = new Table({
              head: ['Column Name', 'Column Type'],
              style: {
                  head: []
              }
          })
          tableInfo.forEach(column => {
              table.push([
                  column.name,
                  column.type
              ])
          })
          logger.info(table.toString())
      }
    })

prog.parse(process.argv);
