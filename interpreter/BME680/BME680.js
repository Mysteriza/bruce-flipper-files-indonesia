"use strict";

var display = require("display");
var keyboard = require("keyboard");
var i2c = require("i2c");

var BME680_ADDR = 0x76;

var W = display.width();
var H = display.height();
var isSmall = (W <= 240 && H <= 135);

var BG = display.color(8, 10, 16);
var CARD = display.color(20, 22, 32);
var TEXT = display.color(210, 215, 225);
var ACCENT = display.color(80, 170, 255);
var GREEN = display.color(70, 210, 110);
var YELLOW = display.color(240, 200, 50);
var ORANGE = display.color(255, 160, 50);
var RED = display.color(230, 60, 60);
var DIM = display.color(110, 115, 130);
var LABEL = display.color(130, 140, 160);

var UPDATE_INTERVAL = 30000;
var ESC_CHECK = 10;

function readRegs(addr, reg, len) {
    try {
        return i2c.writeRead(addr, String.fromCharCode(reg), len);
    } catch (e) {}
    i2c.write(addr, String.fromCharCode(reg), false);
    return i2c.read(addr, len);
}

function writeReg(addr, reg, val) {
    i2c.write(addr, String.fromCharCode(reg, val));
}

function toInt8(v) {
    if (v > 127) v -= 256;
    return v;
}

function toInt16(v) {
    if (v > 32767) v -= 65536;
    return v;
}

var cal = {};

function readCalibration() {
    var c1 = readRegs(BME680_ADDR, 0x8A, 23);
    var c2 = readRegs(BME680_ADDR, 0xE1, 14);
    var c3 = readRegs(BME680_ADDR, 0x00, 5);

    if (typeof c1 !== "object" || typeof c2 !== "object" || typeof c3 !== "object") return false;
    if (c1.length < 23 || c2.length < 14 || c3.length < 5) return false;

    var cc = [];
    var i;
    for (i = 0; i < c1.length; i++) cc.push(c1[i]);
    for (i = 0; i < c2.length; i++) cc.push(c2[i]);
    for (i = 0; i < c3.length; i++) cc.push(c3[i]);

    cal.par_t1 = cc[31] | (cc[32] << 8);
    cal.par_t2 = toInt16(cc[0] | (cc[1] << 8));
    cal.par_t3 = toInt8(cc[2]);

    cal.par_p1 = cc[4] | (cc[5] << 8);
    cal.par_p2 = toInt16(cc[6] | (cc[7] << 8));
    cal.par_p3 = toInt8(cc[8]);
    cal.par_p4 = toInt16(cc[10] | (cc[11] << 8));
    cal.par_p5 = toInt16(cc[12] | (cc[13] << 8));
    cal.par_p6 = toInt8(cc[15]);
    cal.par_p7 = toInt8(cc[14]);
    cal.par_p8 = toInt16(cc[18] | (cc[19] << 8));
    cal.par_p9 = toInt16(cc[20] | (cc[21] << 8));
    cal.par_p10 = cc[22];

    cal.par_h1 = (cc[25] << 4) | (cc[24] & 0x0F);
    cal.par_h2 = toInt16((cc[23] << 4) | (cc[24] >> 4));
    cal.par_h3 = toInt8(cc[26]);
    cal.par_h4 = toInt8(cc[27]);
    cal.par_h5 = toInt8(cc[28]);
    cal.par_h6 = cc[29];
    cal.par_h7 = toInt8(cc[30]);

    cal.par_gh1 = toInt8(cc[35]);
    cal.par_gh2 = toInt16(cc[33] | (cc[34] << 8));
    cal.par_gh3 = toInt8(cc[36]);

    cal.res_heat_range = (cc[39] & 0x30) >> 4;
    cal.res_heat_val = toInt8(cc[37]);
    cal.range_sw_err = toInt8(cc[41] & 0xF0) >> 4;

    return true;
}

var t_fine = 0;

function calcTemperature(tempADC) {
    var var1 = ((tempADC >> 3) - (cal.par_t1 << 1)) | 0;
    var var2 = ((var1 * cal.par_t2) >> 11) | 0;
    var var3 = (((var1 >> 1) * (var1 >> 1)) >> 12) | 0;
    var3 = ((var3 * (cal.par_t3 << 4)) >> 14) | 0;
    t_fine = (var2 + var3) | 0;
    return (((t_fine * 5) + 128) >> 8) | 0;
}

function calcPressure(presADC) {
    var v1 = ((t_fine >> 1) - 64000) | 0;
    var v2 = ((((v1 >> 2) * (v1 >> 2)) >> 11) * cal.par_p6) >> 2;
    v2 = (v2 + ((v1 * cal.par_p5) << 1)) | 0;
    v2 = ((v2 >> 2) + (cal.par_p4 << 16)) | 0;
    var v1b = (((((v1 >> 2) * (v1 >> 2)) >> 13) * (cal.par_p3 << 5)) >> 3) | 0;
    v1b = (v1b + ((cal.par_p2 * v1) >> 1)) | 0;
    v1b = v1b >> 18;
    v1b = ((32768 + v1b) * cal.par_p1) >> 15;
    var pc = 1048576 - presADC;
    pc = ((pc - (v2 >> 12)) * 3125) | 0;
    if (pc >= 0x40000000) {
        pc = (pc / v1b) << 1;
    } else {
        pc = ((pc << 1) / v1b) | 0;
    }
    var t1 = ((cal.par_p9 * (((pc >> 3) * (pc >> 3)) >> 13)) >> 12) | 0;
    var t2 = (((pc >> 2) * cal.par_p8) >> 13) | 0;
    var t3 = ((((pc >> 8) * (pc >> 8) * (pc >> 8)) * cal.par_p10) >> 17) | 0;
    pc = (pc + ((t1 + t2 + t3 + (cal.par_p7 << 7)) >> 4)) | 0;
    return pc;
}

function calcHumidity(humADC) {
    var ts = ((t_fine * 5) + 128) >> 8;
    var v1 = ((humADC - (cal.par_h1 * 16)) - ((((ts * cal.par_h3) / 100) | 0) >> 1)) | 0;
    var p1 = ((ts * cal.par_h4) / 100) | 0;
    var p2 = (((((ts * cal.par_h5) / 100) | 0) * ts) >> 6) / 100 | 0;
    var v2 = ((cal.par_h2 * ((p1 + p2 + 16384) | 0)) >> 10) | 0;
    var v3 = (v1 * v2) | 0;
    var v4 = ((cal.par_h6 << 7) + (((ts * cal.par_h7) / 100) | 0)) >> 4;
    var v5 = (((v3 >> 14) * (v3 >> 14)) >> 10) | 0;
    var v6 = (v4 * v5) >> 1;
    var ch = ((((v3 + v6) >> 10) * 1000) >> 12) | 0;
    if (ch > 100000) ch = 100000;
    if (ch < 0) ch = 0;
    return ch;
}

function calcGasResistance(gasADC, gasRange) {
    if (!gasADC) return 0;
    var v1 = 262144 >> gasRange;
    var v2 = ((gasADC - 512) * 3) + 4096;
    if (v2 === 0) return 0;
    return ((10000 * v1) / v2) * 100;
}

function calcAltitude(pressurePa) {
    if (pressurePa <= 0) return 0;
    return (1.0 - Math.pow(pressurePa / 101325, 0.190284)) * 44307.69396;
}

function readSensor() {
    writeReg(BME680_ADDR, 0x72, 0x01);
    writeReg(BME680_ADDR, 0x74, 0x65);

    delay(5);

    var tries = 0;
    while (tries < 20) {
        delay(25);
        var status = readRegs(BME680_ADDR, 0x1D, 1);
        if (typeof status === "object" && status.length > 0 && (status[0] & 0x80)) break;
        tries++;
    }

    var fields = readRegs(BME680_ADDR, 0x1D, 17);
    if (typeof fields !== "object" || fields.length < 17) return null;

    var presRaw = (fields[2] << 12) | (fields[3] << 4) | (fields[4] >> 4);
    var tempRaw = (fields[5] << 12) | (fields[6] << 4) | (fields[7] >> 4);
    var humRaw = (fields[8] << 8) | fields[9];
    var gasRawHigh = (fields[15] << 2) | (fields[16] >> 6);
    var gasRange = fields[16] & 0x0F;
    var gasValid = fields[16] & 0x20;
    var pressurePa = calcPressure(presRaw);

    return {
        temperature: calcTemperature(tempRaw),
        pressure: pressurePa,
        humidity: calcHumidity(humRaw),
        gasResistance: gasValid ? calcGasResistance(gasRawHigh, gasRange) : 0,
        altitude: calcAltitude(pressurePa)
    };
}

function initSensor() {
    var chipIdData = readRegs(BME680_ADDR, 0xD0, 1);
    var chipId = (typeof chipIdData === "object" && chipIdData.length > 0) ? chipIdData[0] : -1;

    if (chipId !== 0x61) {
        display.fill(BG);
        display.setTextSize(isSmall ? 1 : 2);
        display.drawText("BME680 not found", 10, isSmall ? 50 : 100);
        display.drawText("ID: 0x" + (chipId >= 0 ? chipId.toString(16) : "??"), 10, isSmall ? 65 : 125);
        display.drawText("Check wiring/I2C addr", 10, isSmall ? 80 : 150);
        return false;
    }

    writeReg(BME680_ADDR, 0xE0, 0xB6);
    delay(10);

    if (!readCalibration()) return false;

    writeReg(BME680_ADDR, 0x75, 0x10);
    writeReg(BME680_ADDR, 0x70, 0x00);

    return true;
}

function round1(v) {
    return Math.round(v * 10) / 10;
}

var prevData = {};

function drawUI(data) {
    display.fill(BG);

    var m = isSmall ? 4 : 8;
    var cardW = (W - m * 3) / 2;
    var cardH = isSmall ? 50 : 56;
    var valSize = isSmall ? 2 : 3;
    var smSize = 1;

    drawCard(m, 18, cardW, cardH, "TEMP", data ? round1(data.temperature / 100) + "\x80C" : "---", ACCENT, smSize, valSize);
    drawCard(m + cardW + m, 18, cardW, cardH, "HUM", data ? round1(data.humidity / 1000) + "%" : "---", GREEN, smSize, valSize);
    drawCard(m, 18 + cardH + m, cardW, cardH, "PRESS", data ? Math.round(data.pressure / 100) + "hPa" : "---", YELLOW, smSize, valSize);
    drawCard(m + cardW + m, 18 + cardH + m, cardW, cardH, "ALT", data ? Math.round(data.altitude) + "m" : "---", altColor(data), smSize, valSize);

    var gasY = 18 + (cardH + m) * 2;
    var gasH = isSmall ? 16 : 22;
    drawGasBar(m, gasY, W - m * 2, gasH, data);

    display.setTextSize(1);
    var footer = "ESC=Exit  \x18\x19=Read  Auto:30s";
    display.drawText(footer, m, H - (isSmall ? 8 : 10));
}

function drawCard(x, y, w, h, label, value, color, labelSize, valSize) {
    display.fillRect(x + 1, y + 1, w - 2, h - 2, CARD);
    display.drawRect(x, y, w, h, display.color(35, 38, 50));

    display.setTextSize(labelSize);
    display.drawText(label, x + 4, y + 2);

    display.setTextSize(valSize);
    var valY = y + (valSize === 2 ? 22 : 26);
    display.drawText(String(value), x + 4, valY);
}

function drawGasBar(x, y, w, h, data) {
    display.fillRect(x + 1, y + 1, w - 2, h - 2, CARD);
    display.drawRect(x, y, w, h, display.color(35, 38, 50));

    display.setTextSize(1);
    display.drawText("AIR QUALITY", x + 4, y + 2);

    if (!data || !data.gasResistance) {
        display.drawText("--", x + w - 16, y + 2);
        return;
    }

    var gas = data.gasResistance;
    var pct = gas > 500000 ? 1.0 : gas / 500000;

    var barX = x + 4;
    var barY = y + h - (isSmall ? 7 : 9);
    var barW = w - 8;
    var barH = isSmall ? 4 : 5;

    display.drawRect(barX, barY, barW, barH, DIM);
    if (pct > 0) {
        var fillW = Math.round(barW * pct);
        var bc = gas > 200000 ? GREEN : (gas > 80000 ? YELLOW : ORANGE);
        display.fillRect(barX + 1, barY + 1, Math.max(fillW - 1, 0), barH - 1, bc);
    }

    var gasStr = gas >= 1000 ? Math.round(gas / 1000) + "kO" : Math.round(gas) + "O";
    display.drawText(gasStr, x + w - (isSmall ? 36 : 48), y + 2);
}

function altColor(data) {
    if (!data) return GREEN;
    var a = data.altitude;
    if (a < 100) return GREEN;
    if (a < 500) return YELLOW;
    return ORANGE;
}

function showSplash() {
    display.fill(BG);
    display.setTextSize(isSmall ? 1 : 2);
    var l1 = "BME680";
    var l2 = "Initializing...";
    var cx = W / 2;
    var cy = H / 2;
    display.drawText(l1, cx - (l1.length * (isSmall ? 3 : 6)), cy - (isSmall ? 10 : 16));
    display.setTextSize(1);
    display.drawText(l2, cx - (l2.length * 3), cy + (isSmall ? 6 : 10));
}

function main() {
    showSplash();

    if (typeof i2c.begin !== "function") {
        display.fill(BG);
        display.drawText("i2c module not found", 10, 30);
        display.drawText("Press ESC", 10, 50);
        while (!keyboard.getEscPress()) delay(50);
        return;
    }

    i2c.begin(4, 5, 400000);

    if (!initSensor()) {
        while (!keyboard.getEscPress()) delay(50);
        return;
    }

    var firstRead = readSensor();
    if (firstRead) prevData = firstRead;
    drawUI(firstRead);

    var lastUpdate = 0;

    while (true) {
        if (keyboard.getEscPress()) break;

        if (keyboard.getPrevPress() || keyboard.getNextPress()) {
            lastUpdate = UPDATE_INTERVAL + 1;
        }

        if (lastUpdate >= UPDATE_INTERVAL) {
            var d = readSensor();
            if (d) prevData = d;
            drawUI(d);
            lastUpdate = 0;
        }

        delay(ESC_CHECK);
        lastUpdate += ESC_CHECK;
    }
}

main();
