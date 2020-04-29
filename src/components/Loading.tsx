import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import _ from 'lodash';
import AsyncStorage from '@react-native-community/async-storage';
import moment from 'moment';
import Welcome from './Onboarding/Welcome';
import Location from './Onboarding/Location';
import LocationIOS from './Onboarding/LocationIOS';
import FilterDrivingOnBoarding from './Onboarding/FilterDrivingOnBoarding';
import LocationHistoryOnBoarding from './Onboarding/LocationHistoryOnBoarding';
import Notifications from './Onboarding/Notifications';
import AllSet from './Onboarding/AllSet';
import ScanHome from './Main/ScanHome';
import ExposuresHistory from './Main/ExposuresHistory/ExposuresHistory';
import LocationHistory from './Main/LocationHistory/LocationHistory';
import FilterDriving from './Main/FilterDriving/FilterDriving';
import { Loader, ChangeLanguage, GeneralWebview, ForceUpdate, ForceTerms } from './common';
import { initLocale } from '../actions/LocaleActions';
import { checkForceUpdate, toggleWebview } from '../actions/GeneralActions';
import { setExposures } from '../actions/ExposuresActions';
import { onError } from '../services/ErrorService';
import { purgeSamplesDB } from '../services/SampleService';
import { updateLocationsTimesToUTC } from '../services/LocationService';
import { startForegroundTimer } from '../services/Tracker';
import { IntersectionSickDatabase } from '../database/Database';
import { initConfig } from '../config/config';
import store from '../store';
import { ExternalUrls, NotificationData, Strings } from '../locale/LocaleData';
import { ValidExposure } from '../types';
import {
  SET_VALID_EXPOSURE,
  RESET_EXPOSURES,
  UPDATE_FIRST_POINT,
  HIDE_FORCE_TERMS,
  SHOW_FORCE_TERMS
} from '../constants/ActionTypes';
import {
  CURRENT_TERMS_VERSION,
  FIRST_POINT_TS,
  IS_FIRST_TIME,
  IS_IOS,
  USAGE_ON_BOARDING,
  VALID_EXPOSURE
} from '../constants/Constants';

interface Props {
  isRTL: boolean,
  strings: Strings,
  locale: string,
  externalUrls: ExternalUrls,
  notificationData: NotificationData,
  showLoader: boolean,
  showWebview: boolean,
  showForceUpdate: boolean,
  shouldForce: boolean,
  showChangeLanguage: boolean,
  usageType: string,
  showForceTerms: boolean,
  termsVersion: number,
  initLocale(): void,
  toggleWebview(isShow: boolean, usageType: string): void,
  checkForceUpdate(): void
}

const Loading = (
  {
    isRTL,
    showLoader,
    showChangeLanguage,
    strings,
    locale,
    externalUrls,
    notificationData,
    initLocale,
    showWebview,
    usageType,
    toggleWebview,
    showForceUpdate,
    shouldForce,
    showForceTerms,
    checkForceUpdate,
    termsVersion
  }: Props
) => {
  const shouldShowForceTerms = useRef(false);

  const [initialRoute, setInitialRoute] = useState('');

  useEffect(() => {
    appLoadingActions();
  }, []);

  useEffect(() => {
    if (!showWebview && shouldShowForceTerms.current) {
      store().dispatch({ type: SHOW_FORCE_TERMS, payload: { terms: termsVersion } });
      shouldShowForceTerms.current = false;
    }
  }, [showWebview]);

  const appLoadingActions = async () => {
    try {
      await updateLocationsTimesToUTC();
      await initConfig();
      initLocale();

      !IS_IOS && await store().dispatch({ type: RESET_EXPOSURES }); // first thing - clear the redux store to fix the android duplications bug

      const notFirstTime = await AsyncStorage.getItem(IS_FIRST_TIME);

      if (notFirstTime === null) {
        return setInitialRoute('Welcome');
      }

      await purgeSamplesDB();

      await startForegroundTimer();

      const validExposure = await AsyncStorage.getItem(VALID_EXPOSURE);

      if (validExposure) {
        const { exposure, timestamp }: ValidExposure = JSON.parse(validExposure);

        if (moment().diff(moment(timestamp), 'days') < 14) {
          store().dispatch({ type: SET_VALID_EXPOSURE, payload: { validExposure: exposure } });
        } else {
          await AsyncStorage.removeItem(VALID_EXPOSURE);
        }
      }

      const dbSick = new IntersectionSickDatabase();

      const exposures = await dbSick.listAllRecords();

      await store().dispatch(setExposures(exposures.map((exposure: any) => ({ properties: { ...exposure } }))));

      const firstPointTS = JSON.parse(await AsyncStorage.getItem(FIRST_POINT_TS) || 'false');
      firstPointTS && store().dispatch({ type: UPDATE_FIRST_POINT, payload: firstPointTS });

      setInitialRoute('ScanHome');
    } catch (error) {
      const notFirstTime = await AsyncStorage.getItem(IS_FIRST_TIME);
      setInitialRoute(notFirstTime === null ? 'Welcome' : 'ScanHome');
      onError({ error });
    }
  };

  const onSeeTerms = () => {
    store().dispatch({ type: HIDE_FORCE_TERMS });
    shouldShowForceTerms.current = true;
    setTimeout(() => toggleWebview(true, USAGE_ON_BOARDING), 300);
  };

  const onApprovedTerms = async () => {
    store().dispatch({ type: HIDE_FORCE_TERMS });
    await AsyncStorage.setItem(CURRENT_TERMS_VERSION, JSON.stringify(termsVersion));
    checkForceUpdate();
  };

  const Stack = createStackNavigator();

  return (
    (_.isEmpty(strings) || !initialRoute) ? null : (
      <View style={styles.container}>
        <Stack.Navigator mode="modal" headerMode="none" initialRouteName={initialRoute}>
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="Location" component={Location} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="LocationIOS" component={LocationIOS} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="FilterDrivingOnBoarding" component={FilterDrivingOnBoarding} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="LocationHistoryOnBoarding" component={LocationHistoryOnBoarding} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="Notifications" component={Notifications} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="AllSet" component={AllSet} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="ScanHome" component={ScanHome} options={{ cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid }} />
          <Stack.Screen name="ExposuresHistory" component={ExposuresHistory} options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }} />
          <Stack.Screen name="LocationHistory" component={LocationHistory} options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }} />
          <Stack.Screen name="FilterDriving" component={FilterDriving} options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }} />
        </Stack.Navigator>

        <Loader isVisible={showLoader} />
        <ChangeLanguage isVisible={showChangeLanguage} />
        <GeneralWebview isVisible={showWebview} locale={locale} externalUrls={externalUrls} closeWebview={() => toggleWebview(false, '')} usageType={usageType} />
        <ForceUpdate isVisible={showForceUpdate} shouldForce={shouldForce} strings={strings} />
        <ForceTerms isVisible={showForceTerms} isRTL={isRTL} strings={strings} onSeeTerms={onSeeTerms} onApprovedTerms={onApprovedTerms} />
      </View>
    )
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

const mapStateToProps = (state: any) => {
  const {
    general: { showLoader, showWebview, showForceUpdate, shouldForce, usageType, showForceTerms, termsVersion },
    locale: { showChangeLanguage, strings, locale, isRTL, externalUrls, notificationData }
  } = state;

  return { strings, showLoader, showChangeLanguage, showWebview, locale, showForceUpdate, shouldForce, usageType, showForceTerms, isRTL, termsVersion, externalUrls, notificationData };
};

const mapDispatchToProps = (dispatch: any) => {
  return bindActionCreators({
    initLocale,
    toggleWebview,
    checkForceUpdate
  }, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Loading);
