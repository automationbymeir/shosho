// Copyright (c) 2013-2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Library for Google Apps Script that provides the ability to
 * create and authorize OAuth2 tokens as well as refresh them when they expire.
 * This library uses Apps Script's StateTokenBuilder and /usercallback endpoint
 * to handle the redirects.
 *
 * @author joel.j.ferguson@gmail.com (Joel Ferguson)
 * @author s-kris@google.com (Sangeeth Krishna)
 * @author bshubbard@google.com (Blake Hubbard)
 */

var OAuth2 = (function(root) {

  var OAUTH2_PREFIX = 'oauth2';
  var OAUTH2_TOKEN_PREFIX = 'oauth2.token';
  var OAUTH2_PROPERTY_SERVICE_PREFIX = 'oauth2.service';
  
  /**
   * Represents an OAuth2 service.
   *
   * @param {string} serviceName The name of the service.
   * @constructor
   */
  var OAuth2Service = function(serviceName) {
    this.serviceName = serviceName;
    this.tokenUrl = null;
    this.authorizationBaseUrl = null;
    this.redirectUri = null;
    this.clientId = null;
    this.clientSecret = null;
    this.privateKey = null;
    this.callbackFunction = null;
    this.propertyStore = null;
    this.cache = null;
    this.jwtCallback = null;
    this.param = {};
    this.scope = null;
    this.tokenFormat = 'params';
    this.tokenHeaders = {};
  };

  /**
   * Sets the property store to use for persisting the OAuth2 token. By default it
   * uses the user properties store but you can use this method to set a
   * different store, like the script properties store.
   *
   * @param {PropertiesService.Properties} propertyStore The property store to use.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setPropertyStore = function(propertyStore) {
    this.propertyStore = propertyStore;
    return this;
  };

  /**
   * Sets the cache to use for temporarily persisting the OAuth2 state token. By
   * default it uses the user cache but you can use this method to set a different
   * cache, like the script cache.
   *
   * @param {CacheService.Cache} cache The cache to use.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setCache = function(cache) {
    this.cache = cache;
    return this;
  };

  /**
   * Sets the authorization base URL to use for the OAuth2 flow.
   *
   * @param {string} authorizationBaseUrl The authorization base URL.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setAuthorizationBaseUrl = function(authorizationBaseUrl) {
    this.authorizationBaseUrl = authorizationBaseUrl;
    return this;
  };

  /**
   * Sets the token URL to use for the OAuth2 flow.
   *
   * @param {string} tokenUrl The token URL.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setTokenUrl = function(tokenUrl) {
    this.tokenUrl = tokenUrl;
    return this;
  };

  /**
   * Sets the client ID to use for the OAuth2 flow.
   *
   * @param {string} clientId The client ID.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setClientId = function(clientId) {
    this.clientId = clientId;
    return this;
  };

  /**
   * Sets the client secret to use for the OAuth2 flow.
   *
   * @param {string} clientSecret The client secret.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setClientSecret = function(clientSecret) {
    this.clientSecret = clientSecret;
    return this;
  };

  /**
   * Sets the private key to use for the OAuth2 flow. This is used for service
   * account authentication.
   *
   * @param {string} privateKey The private key.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setPrivateKey = function(privateKey) {
    this.privateKey = privateKey;
    return this;
  };

  /**
   * Sets the callback function name to use for the OAuth2 flow.
   *
   * @param {string} callbackFunction The callback function name.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setCallbackFunction = function(callbackFunction) {
    this.callbackFunction = callbackFunction;
    return this;
  };

  /**
   * Sets the scope(s) to request during the OAuth2 flow.
   *
   * @param {string|string[]} scope The scope(s) to request.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setScope = function(scope) {
    this.scope = scope;
    return this;
  };

  /**
   * Sets an additional parameter to use during the OAuth2 flow.
   *
   * @param {string} name The name of the parameter.
   * @param {string} value The value of the parameter.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setParam = function(name, value) {
    this.param[name] = value;
    return this;
  };

  /**
   * Sets a callback function that will be called just before the token is
   * refreshed. The function receives the service object as the only parameter.
   *
   * @param {Function} callback The callback function.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setJwtCallback = function(callback) {
    this.jwtCallback = callback;
    return this;
  };

  /**
   * Sets the format of the token. By default, it's 'params', but some services
   * may require 'json'.
   *
   * @param {string} tokenFormat The token format.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setTokenFormat = function(tokenFormat) {
    this.tokenFormat = tokenFormat;
    return this;
  };

  /**
   * Sets additional headers to use when requesting a token.
   *
   * @param {Object} tokenHeaders The additional headers.
   * @return {OAuth2Service} A reference to this object.
   */
  OAuth2Service.prototype.setTokenHeaders = function(tokenHeaders) {
    this.tokenHeaders = tokenHeaders;
    return this;
  };

  /**
   * Resets the stored token.
   */
  OAuth2Service.prototype.reset = function() {
    this.getPropertyStore().deleteProperty(this.getAccessTokenKey_());
    this.getPropertyStore().deleteProperty(this.getRefreshTokenKey_());
  };

  /**
   * Returns the URL to use for the OAuth2 authorization flow.
   *
   * @return {string} The authorization URL.
   */
  OAuth2Service.prototype.getAuthorizationUrl = function() {
    var params = {
      'response_type': 'code',
      'client_id': this.clientId,
      'redirect_uri': this.getRedirectUri(),
      'scope': Array.isArray(this.scope) ? this.scope.join(' ') : this.scope,
      'state': ScriptApp.newStateToken()
        .withMethod(this.callbackFunction)
        .withTimeout(3600)
        .createToken()
    };
    
    // Add any additional parameters
    for (var name in this.param) {
      params[name] = this.param[name];
    }
    
    return this.authorizationBaseUrl + '?' +
      Object.keys(params).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      }).join('&');
  };

  /**
   * Handles the OAuth2 redirect. This is the callback function that is specified
   * in the OAuth2 flow.
   *
   * @param {Object} request The request object.
   * @return {boolean} Whether the callback was successful.
   */
  OAuth2Service.prototype.handleCallback = function(request) {
    var code = request.parameter.code;
    var error = request.parameter.error;
    if (error) {
      throw 'Authorization failed: ' + error;
    }
    
    var token = this.requestToken({
      'grant_type': 'authorization_code',
      'code': code,
      'redirect_uri': this.getRedirectUri(),
      'client_id': this.clientId,
      'client_secret': this.clientSecret
    });
    
    this.saveToken(token);
    return true;
  };

  /**
   * Returns whether the service has access to the protected resource.
   *
   * @return {boolean} Whether the service has access.
   */
  OAuth2Service.prototype.hasAccess = function() {
    var token = this.getToken();
    return token && token.access_token;
  };

  /**
   * Returns the access token for the service.
   *
   * @return {string} The access token.
   */
  OAuth2Service.prototype.getAccessToken = function() {
    var token = this.getToken();
    if (!token) {
      throw 'No access token.';
    }
    
    // If the token is expired, refresh it.
    if (token.expires_at < new Date().getTime() / 1000) {
      if (!token.refresh_token) {
        throw 'No refresh token available.';
      }
      token = this.refreshAccessToken(token);
    }
    
    return token.access_token;
  };

  /**
   * Fetches a new access token and refresh token.
   *
   * @param {Object} payload The payload to send to the token URL.
   * @return {Object} The token.
   */
  OAuth2Service.prototype.requestToken = function(payload) {
    var options = {
      'method': 'post',
      'contentType': 'application/x-www-form-urlencoded',
      'payload': payload
    };
    
    // Add any additional headers
    for (var name in this.tokenHeaders) {
      options.headers[name] = this.tokenHeaders[name];
    }
    
    var response = UrlFetchApp.fetch(this.tokenUrl, options);
    var token = JSON.parse(response.getContentText());
    
    if (token.error) {
      throw 'Token request failed: ' + token.error;
    }
    
    return token;
  };

  /**
   * Refreshes the access token.
   *
   * @param {Object} token The token to refresh.
   * @return {Object} The new token.
   */
  OAuth2Service.prototype.refreshAccessToken = function(token) {
    if (this.jwtCallback) {
      this.jwtCallback(this);
    }
    
    var payload = {
      'grant_type': 'refresh_token',
      'client_id': this.clientId,
      'client_secret': this.clientSecret,
      'refresh_token': token.refresh_token
    };
    
    var newToken = this.requestToken(payload);
    
    // If a refresh token is not returned, use the existing one.
    if (!newToken.refresh_token) {
      newToken.refresh_token = token.refresh_token;
    }
    
    this.saveToken(newToken);
    return newToken;
  };

  /**
   * Saves the token to the property store.
   *
   * @param {Object} token The token to save.
   */
  OAuth2Service.prototype.saveToken = function(token) {
    token.expires_at = new Date().getTime() / 1000 + token.expires_in;
    this.getPropertyStore().setProperty(this.getAccessTokenKey_(), JSON.stringify(token));
  };

  /**
   * Returns the token from the property store.
   *
   * @return {Object} The token.
   */
  OAuth2Service.prototype.getToken = function() {
    var token = this.getPropertyStore().getProperty(this.getAccessTokenKey_());
    return token ? JSON.parse(token) : null;
  };

  /**
   * Returns the key for the access token.
   *
   * @return {string} The key.
   */
  OAuth2Service.prototype.getAccessTokenKey_ = function() {
    return this.serviceName + OAUTH2_TOKEN_PREFIX;
  };

  /**
   * Returns the key for the refresh token.
   *
   * @return {string} The key.
   */
  OAuth2Service.prototype.getRefreshTokenKey_ = function() {
    return this.serviceName + OAUTH2_TOKEN_PREFIX;
  };

  /**
   * Returns the redirect URI.
   *
   * @return {string} The redirect URI.
   */
  OAuth2Service.prototype.getRedirectUri = function() {
    if (!this.redirectUri) {
      this.redirectUri = ScriptApp.getService().getUrl() + '/usercallback';
    }
    return this.redirectUri;
  };

  /**
   * Returns the property store.
   *
   * @return {PropertiesService.Properties} The property store.
   */
  OAuth2Service.prototype.getPropertyStore = function() {
    if (!this.propertyStore) {
      this.propertyStore = PropertiesService.getUserProperties();
    }
    return this.propertyStore;
  };

  // Expose the public API.
  return {
    createService: function(serviceName) {
      return new OAuth2Service(serviceName);
    },
    getRedirectUri: function() {
      return ScriptApp.getService().getUrl() + '/usercallback';
    }
  };

})(this);