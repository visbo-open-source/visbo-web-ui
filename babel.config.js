module.exports = {
    presets: [
        ['@babel/preset-env', {
            targets: {
                node: 'lts'
            }
        }]
    ],
    plugins: [],
    env: {
        development: {
            sourceMaps: 'inline',
            plugins: ['source-map-support']
        }
    },
    comments: false
}
