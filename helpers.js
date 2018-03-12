
const path = require('path')
const os = require('os')
const fg = require('fast-glob')

module.exports.projectsPath = path.join(os.homedir(), '.augmentable')

module.exports.projectFiles = fg.sync(['*.sqlite'], {
    cwd: module.exports.projectsPath,
    stats: true
})