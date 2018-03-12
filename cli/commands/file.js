const path = require('path')
const inquirer = require('inquirer')
const csvSQLite = require('csv-sqlite')
const fs = require('fs')

const { projectFiles, projectsPath } = require('../../helpers')

module.exports.import = async function(args, options, logger) {
    let {filePath, projectName, tableName} = args
    if (!filePath) {
        const fp = await inquirer.prompt({
            type: 'input',
            name: 'filePath',
            message: 'File path (relative to CWD or absolute)'
        })
        filePath = fp.filePath
    }
    if (!projectName) {
        const pn = await inquirer.prompt({
            type: 'list',
            name: 'projectName',
            message: 'Name of project to use (will create if one doesn\'t exist)',
            choices: projectFiles.map(p => path.basename(p.path, '.sqlite'))
        })
        projectName = pn.projectName
    }
    if (!tableName) {
        const tn = await inquirer.prompt({
            type: 'input',
            name: 'tableName',
            message: 'Name of table to import into (existing or new)'
        })
        tableName = tn.tableName
    }

    if (!fs.existsSync(filePath)) logger.error('Could not find import file')

    const dbFilePath = path.join(projectsPath, `${projectName}.sqlite`)

    await csvSQLite.importFromFile(dbFilePath, filePath, tableName, 0)
}