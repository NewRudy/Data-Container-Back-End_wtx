const fs = require('fs')

if(fs.existsSync('Z:/China_grid_rainfall_hourly')) {
	console.log('yes')
} else {
	console.log('no')
}

console.log('res: ', fs.existsSync('Z:/China_grid_rainfall_hourly'))

let testPath = 'Z:/China_grid_rainfall_hourly'
try {
	fs.accessSync(testPath)
	console.log('yes')
}catch(err) {
	console.log('no')
}
