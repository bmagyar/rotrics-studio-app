import { combineReducers } from 'redux';
import hotKeys from "./hotKeys";
import laserText from "./laserText";
import serialPort from "./serialPort";
import vm from "./vm";
import tap from "./tap";
import p3d from "./p3d";

export default combineReducers({
    hotKeys,
    laserText,
    serialPort,
    vm,
    tap,
    p3d
});
