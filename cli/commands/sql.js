const path = require('path')
const inquirer = require('inquirer')
const csvSQLite = require('csv-sqlite')

const { projectFiles, projectsPath } = require('../../helpers')

module.exports.exec = async function(args, options, logger) {
    let projectName = args.projectName
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

    let sql = args.sql
    if (!sql) {
        const s = await inquirer.prompt({
            type: 'input',
            name: 'sql',
            message: 'SQL'
        })
        sql = s.sql
    }
    let rows
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
}