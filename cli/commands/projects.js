const path = require('path')
const ora = require('ora')
const Table = require('cli-table2')
const inquirer = require('inquirer')
const csvSQLite = require('csv-sqlite')
const moment = require('moment')
const numbro = require('numbro')
const fs = require('fs')

const { projectFiles, projectsPath } = require('../../helpers')

module.exports.list = function(args, options, logger) {
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
            const birthTime = (new Date(p.birthtime))
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
            const birthTime = moment(new Date(p.birthtime))
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
}

module.exports.create = async function(args) {
    let projectName = args.name
    
    if (!projectName) {
        const pn = await inquirer.prompt({
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
}

module.exports.delete = async function(args) {
    let projectName = args.name
    if (!projectName) {
        const pn = await inquirer.prompt([{
            type: 'list',
            name: 'projectName',
            message: 'Select Project',
            choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
        }])
        projectName = pn.projectName
    }
    const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)

    const c = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure? This will remove the SQLite database file and is irreversible'
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
}

module.exports.rename = async function(args) {
    let projectName = args.project
    let newName = args.newName
    if (!projectName) {
        const pn = await inquirer.prompt([{
            type: 'list',
            name: 'projectName',
            message: 'Select Project',
            choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
        }])
        projectName = pn.projectName
    }

    if (!newName) {
        const nn  = await inquirer.prompt({
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
}

module.exports.tables = async function(args, options, logger) {
    let projectName = args.project
    if (!projectName) {
        const pn = await inquirer.prompt([{
            type: 'list',
            name: 'projectName',
            message: 'Select Project',
            choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
        }])
        projectName = pn.projectName
    }
    const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)
    const tables = csvSQLite.prepare(dbFilePath, 'SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\'')

    const spinner = ora('Project tables').start()

    if (!fs.existsSync(dbFilePath)) {
        spinner.fail(`Could not find project ${projectName}`)
        return
    }

    tables.forEach(async t => {
        const tableInfo = csvSQLite.prepare(dbFilePath, `PRAGMA table_info(${t.name})`)
        t.info = tableInfo
    })

    spinner.stop()

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
}