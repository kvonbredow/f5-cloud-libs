/**
 * Copyright 2016 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

module.exports = {
    clientRequest: {
        eventMap: {},
        incomingMessage: {
            eventMap: {},
            headers: {},
            statusCode: 200,
            on: function(event, cb) {
                this.eventMap[event] = cb;
            },
            emit: function(event, args) {
                if (this.eventMap[event]) {
                    this.eventMap[event](args);
                }
            }
        },
        end: function() {
            this.cb(this.incomingMessage);
            this.incomingMessage.emit('data', this.response);
            this.incomingMessage.emit('end');
        },
        on: function(event, cb) {
            this.eventMap[event] = cb;
        },
        setTimeout: function(timeout) {
            this.timeout = timeout;
        },
        write: function(data) {
            this.data = data;
        }
    },

    request: function(options, cb) {
        this.lastRequest = options;
        this.clientRequest.cb = cb;
        return this.clientRequest;
    },

    setResponse: function(response, headers) {
        var key;
        var lowerCaseHeaders = {};
        this.clientRequest.response = typeof response === 'object' ? JSON.stringify(response) : response;
        for (key in headers) {
            lowerCaseHeaders[key.toLowerCase()] = headers[key];
        }
        this.clientRequest.incomingMessage.headers = lowerCaseHeaders;
    },

    reset: function() {
        delete this.clientRequest.cb;
        delete this.clientRequest.data;
        delete this.clientRequest.response;
        delete this.clientRequest.timeout;
        this.clientRequest.incomingMessage.headers = {};
        this.clientRequest.eventMap = {};
        delete this.lastRequest;
    }
};