var os = require('os')
var cpuu =  require('cputilization')

exports.systemStatus =  function (req, res) {
    // 计算CPU使用情况
    cpuu((err, sample)=>{
        var cpuUsage = sample.percentageBusy().toFixed(4);
        var mem =  Number((1-os.freemem()/os.totalmem()).toFixed(4));
        const time = new Date().toLocaleTimeString('it-IT');
        res.send({
           mem: mem,
           timer: time,
            cpu: cpuUsage
        });
    });
};
exports.systemInfo = function (req, res) {
    const tmpdir = os.tmpdir();
    const hostname = os.hostname();
    const release = os.release();
    const osType = os.type();
    const totalMem  = (os.totalmem()/1024/1024/1024).toFixed(4);
    res.send({
        tmpdir,
        hostname,
        release,
        osType,
        totalMem
    });
}
