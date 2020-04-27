import DeviceInfo from 'react-native-device-info';
import axios, { AxiosResponse } from 'axios';
import { onError } from '../services/ErrorService';
import DefaultConfig from './default_config.json';
import { Config } from '../types';
import { API_ROOT } from '../constants/Constants';

// @ts-ignore
const env: 'com.tracovid.qa'|'com.tracovid' = DeviceInfo.getBundleId();

let config: Config = DefaultConfig[env] || DefaultConfig['com.tracovid.qa'];

export const initConfig = async () => new Promise(async (resolve) => {
  try {
    const res: AxiosResponse = await axios.get(`${API_ROOT}/tracovidGetConfigUrl`, { headers: { 'Content-Type': 'application/json;charset=utf-8' } });
    const { data } = await axios.get(`${res.data[env]}?r=${Math.random()}`, { headers: { 'Content-Type': 'application/json;charset=utf-8' } });

    config = data[env];
    resolve();
  } catch (error) {
    onError({ error });
    resolve();
  }
});

export default function () {
  return config;
}
