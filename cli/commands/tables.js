const path = require('path')
const ora = require('ora')
const Table = require('cli-table2')
const inquirer = require('inquirer')
const csvSQLite = require('csv-sqlite')

const { projectFiles, projectsPath } = require('../../helpers')

module.exports.drop = async function(args) {
    let projectName = args.project
    if (!projectName) {
        const pn  = await inquirer.prompt([{
            type: 'list',
            name: 'projectName',
            message: 'Select Project',
            choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
        }])
        projectName = pn.projectName
    }
    const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
    const tables = csvSQLite.prepare(dbFilePath, 'SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\'')
    let tableName = args.table
    if (!tableName) {
        const tn = await inquirer.prompt([{
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
}

module.exports.columns = async function(args, options, logger) {
    let projectName = args.project
    if (!projectName) {
        const pn  = await inquirer.prompt([{
            type: 'list',
            name: 'projectName',
            message: 'Select Project',
            choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
        }])
        projectName = pn.projectName
    }
    
    let tableName = args.table
    if (!tableName) {
        const tn  = await inquirer.prompt({
            type: 'input',
            name: 'tableName',
            message: 'Table name'
        })
        tableName = tn.tableName
        if (!tableName){
            logger.info('No Table name provided')
            return
        }
    }
    
    const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
    
    const tableInfo = csvSQLite.prepare(dbFilePath, `PRAGMA table_info(${tableName})`)
    
    if (!tableInfo.length){
        logger.info('Table not found')
        return
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
}