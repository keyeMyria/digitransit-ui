import PropTypes from 'prop-types';
import React from 'react';
import connectToStores from 'fluxible-addons-react/connectToStores';
import withReducer from 'recompose/withReducer';
import onlyUpdateForKeys from 'recompose/onlyUpdateForKeys';

import ComponentUsageExample from '../ComponentUsageExample';
import Map from './Map';
import ToggleMapTracking from '../ToggleMapTracking';

function mapStateReducer(state, action) {
  switch (action.type) {
    case 'enable':
      return {
        ...state,
        initialZoom: false,
        mapTracking: true,
        focusOnOrigin: false,
      };
    case 'disable':
      return {
        ...state,
        initialZoom: false,
        mapTracking: false,
        focusOnOrigin: false,
      };
    case 'useOrigin':
      return {
        ...state,
        initialZoom: true,
        mapTracking: false,
        focusOnOrigin: true,
        previousOrigin: action.origin,
      };
    case 'usePosition':
      return {
        ...state,
        initialZoom: true,
        mapTracking: true,
        focusOnOrigin: false,
        previousOrigin: action.origin,
      };
    default:
      return state;
  }
}

const withMapStateTracking = withReducer(
  'mapState',
  'dispatch',
  mapStateReducer,
  {
    initialZoom: true,
    mapTracking: true,
    focusOnOrigin: true,
  },
);

const onlyUpdateCoordChanges = onlyUpdateForKeys(
  // searchModalIsOpen and selectedTab keys here's just to get map updated
  // when those props change (in large view tabs are inside map)
  [
    'breakpoint',
    'lat',
    'lon',
    'zoom',
    'mapTracking',
    'lang',
    'tab',
    'searchModalIsOpen',
    'selectedTab',
  ],
);

const MapWithTracking = connectToStores(
  onlyUpdateCoordChanges(Map),
  ['PositionStore', 'EndpointStore', 'PreferencesStore'],
  (context, props) => {
    const { mapTracking } = props.mapState;
    const PositionStore = context.getStore('PositionStore');
    const position = PositionStore.getLocationState();
    const origin = context.getStore('EndpointStore').getOrigin();
    const language = context.getStore('PreferencesStore').getLanguage();

    let location;
    let zoom;

    console.log(context);

    if (
      props.mapState.focusOnOrigin &&
      !origin.useCurrentPosition &&
      origin.lat != null &&
      origin.lon != null
    ) {
      location = origin;
      zoom = 16;
    } else if (mapTracking && position.hasLocation) {
      location = position;
      zoom = 16;
    } else {
      location =
        context.config.defaultMapCenter || context.config.defaultEndpoint;
      zoom = 14;
    }

    if (
      !origin.useCurrentPosition &&
      origin !== props.mapState.previousOrigin &&
      origin.lat != null &&
      origin.lon != null
    ) {
      setTimeout(props.dispatch, 0, {
        type: 'useOrigin',
        origin,
      });
      location = origin;
    } else if (
      origin.useCurrentPosition &&
      props.mapState.previousOrigin &&
      origin !== props.mapState.previousOrigin
    ) {
      setTimeout(props.dispatch, 0, {
        type: 'usePosition',
        origin,
      });
      location = position;
    }

    function enableMapTracking() {
      if (!mapTracking) {
        props.dispatch({
          type: 'enable',
        });
      }
    }

    function disableMapTracking() {
      if (mapTracking) {
        props.dispatch({
          type: 'disable',
        });
      }
    }

    const children = React.Children.toArray(props.children);

    const mapToggle = (
      <ToggleMapTracking
        key="toggleMapTracking"
        handleClick={mapTracking ? disableMapTracking : enableMapTracking}
        className={`icon-mapMarker-toggle-positioning-${mapTracking
          ? 'online'
          : 'offline'}`}
      />
    );

    if (position.hasLocation) {
      children.push(mapToggle);
    }

    return {
      lat: location ? location.lat : null,
      lon: location ? location.lon : null,
      zoom: (props.mapState.initialZoom && zoom) || undefined,
      lang: language, // passing this prop just because we want map to
      // update on lang changes, lang is not used
      mapTracking,
      position,
      className: 'flex-grow',
      displayOriginPopup: true,
      leafletEvents: {
        onDragstart: disableMapTracking,
        onZoomend: disableMapTracking,
      },
      disableMapTracking,
      children,
    };
  },
);

MapWithTracking.contextTypes = {
  getStore: PropTypes.func.isRequired,
  config: PropTypes.shape({
    defaultMapCenter: PropTypes.shape({
      lon: PropTypes.number.isRequired,
      lat: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
};

MapWithTracking.description = (
  <div>
    <p>Renders a map with map-tracking functionality</p>
    <ComponentUsageExample description="">
      <MapWithTracking />
    </ComponentUsageExample>
  </div>
);

export default withMapStateTracking(MapWithTracking);
