/**
 * Copyright 2018 F5 Networks, Inc.
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

const GenericNodeProvider = require('../../lib/genericNodeProvider');
const utilMock = require('../../lib/util');
const q = require('q');

const origGetDataFromUrl = utilMock.getDataFromUrl;

const propertyPaths = {
    propertyPathId: 'node.uuid',
    propertyPathIpPrivate: 'node.ips.0',
    propertyPathIpPublic: 'node.ips.1'
};

let providerOptions = {
    foo: 'bar',
};
providerOptions = Object.assign(providerOptions, propertyPaths);

const initOptions = {
    bar: 'foo',
    world: 'hello'
};

const responseNodeData = [
    {
        foo: 'bar',
        node: {
            uuid: 'b10b5485-d6f1-47c2-9153-831dda8e1467',
            ips: [
                '192.168.0.140',
                '10.10.0.10'
            ]
        }
    },
    {
        hello: 'world',
        node: {
            uuid: '4cd3e814-09b1-4ea6-88f5-9524d45c1eda',
            ips: [
                '192.168.0.141',
                '11.11.0.11'
            ]
        }
    }
];

const targetUrl = 'https://example.com';
const targetOptions = {
    headers: { headerName: 'headerValue' },
    rejectUnauthorized: false
};

let testProvider;
let globalTests;

// Our tests cause too many event listeners. Turn off the check.
process.setMaxListeners(0);

function mockGetDataFromUrl(test, urlResponse) {
    globalTests += 2;
    utilMock.getDataFromUrl = function getDataFromUrl(url, options) {
        test.strictEqual(url, targetUrl);
        test.deepEqual(options, targetOptions);
        return q(urlResponse);
    };
}

module.exports = {
    setUp(callback) {
        testProvider = new GenericNodeProvider();
        globalTests = 0;
        callback();
    },

    tearDown(callback) {
        utilMock.getDataFromUrl = origGetDataFromUrl;
        callback();
    },

    testLogger(test) {
        const logger = {
            a: 1,
            b: 2
        };
        testProvider = new GenericNodeProvider({ logger });
        test.deepEqual(testProvider.logger, logger);
        test.done();
    },

    testInit: {
        testMissingProviderOptions(test) {
            test.expect(2);
            testProvider.init()
                .then(() => {
                    test.ok(false, 'should have thrown missing required provider options');
                })
                .catch((err) => {
                    test.notStrictEqual(err.message.indexOf('ProviderOptions.propertyPathId required'), -1);
                })
                .then(() => {
                    return testProvider.init({ propertyPathId: 'foo' });
                })
                .then(() => {
                    test.ok(false, 'should have thrown missing required provider options');
                })
                .catch((err) => {
                    test.notStrictEqual(err.message.indexOf('ProviderOptions.propertyPathIpPrivate '
                        + 'required'), -1);
                })
                .finally(() => {
                    test.done();
                });
        },

        testInitSuccess(test) {
            test.expect(1);
            testProvider.init(providerOptions, initOptions)
                .then(() => {
                    test.ok(true);
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        },

        testProviderOptions(test) {
            test.expect(2);
            testProvider.init(providerOptions)
                .then(() => {
                    test.deepEqual(testProvider.providerOptions, providerOptions);
                    test.deepEqual(testProvider.propertyPaths, {
                        propertyPathId: ['node', 'uuid'],
                        propertyPathIpPrivate: ['node', 'ips', '0'],
                        propertyPathIpPublic: ['node', 'ips', '1']
                    });
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        },

        testPropertyPathNoIpPublic(test) {
            const optsNoPublic = JSON.parse(JSON.stringify(providerOptions));
            delete optsNoPublic.propertyPathIpPublic;
            test.expect(2);
            testProvider.init(optsNoPublic)
                .then(() => {
                    test.deepEqual(testProvider.providerOptions, optsNoPublic);
                    test.deepEqual(testProvider.propertyPaths, {
                        propertyPathId: ['node', 'uuid'],
                        propertyPathIpPrivate: ['node', 'ips', '0'],
                        propertyPathIpPublic: []
                    });
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        },

        testInitOptions(test) {
            test.expect(1);
            testProvider.init(providerOptions, initOptions)
                .then(() => {
                    test.deepEqual(testProvider.initOptions, initOptions);
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        }
    },

    testGetNodesFromUri: {
        testBadJsonStringResponse(test) {
            mockGetDataFromUrl(test, 'foo');

            test.expect(globalTests + 1);
            testProvider.getNodesFromUri(targetUrl, targetOptions)
                .then(() => {
                    test.ok(false, 'should have thrown bad response data');
                })
                .catch((err) => {
                    test.notStrictEqual(err.message.indexOf('Data must parse to a JSON array'), -1);
                })
                .finally(() => {
                    test.done();
                });
        },

        testBadJsonArrayResponse(test) {
            mockGetDataFromUrl(test, {});

            test.expect(globalTests + 1);
            testProvider.getNodesFromUri(targetUrl, targetOptions)
                .then(() => {
                    test.ok(false, 'should have thrown bad response data');
                })
                .catch((err) => {
                    test.notStrictEqual(err.message.indexOf('Data must be a JSON array'), -1);
                })
                .finally(() => {
                    test.done();
                });
        },

        testNoNodes(test) {
            mockGetDataFromUrl(test, JSON.stringify([{ foo: 'bar' }]));

            test.expect(globalTests + 1);
            testProvider.init(providerOptions)
                .then(() => {
                    return testProvider.getNodesFromUri(targetUrl, targetOptions)
                        .then((results) => {
                            test.deepEqual(results, []);
                        });
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        },

        testJsonStringNodes(test) {
            mockGetDataFromUrl(test, JSON.stringify(responseNodeData));

            test.expect(globalTests + 1);
            testProvider.init(providerOptions)
                .then(() => {
                    return testProvider.getNodesFromUri(targetUrl, targetOptions)
                        .then((results) => {
                            test.deepEqual(results, [
                                {
                                    id: 'b10b5485-d6f1-47c2-9153-831dda8e1467',
                                    ip: {
                                        public: '10.10.0.10',
                                        private: '192.168.0.140'
                                    }
                                },
                                {
                                    id: '4cd3e814-09b1-4ea6-88f5-9524d45c1eda',
                                    ip: {
                                        public: '11.11.0.11',
                                        private: '192.168.0.141'
                                    }
                                }
                            ]);
                        });
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        },

        testJsonArrayNodes(test) {
            mockGetDataFromUrl(test, responseNodeData);

            test.expect(globalTests + 1);
            testProvider.init(providerOptions)
                .then(() => {
                    return testProvider.getNodesFromUri(targetUrl, targetOptions)
                        .then((results) => {
                            test.deepEqual(results, [
                                {
                                    id: 'b10b5485-d6f1-47c2-9153-831dda8e1467',
                                    ip: {
                                        public: '10.10.0.10',
                                        private: '192.168.0.140'
                                    }
                                },
                                {
                                    id: '4cd3e814-09b1-4ea6-88f5-9524d45c1eda',
                                    ip: {
                                        public: '11.11.0.11',
                                        private: '192.168.0.141'
                                    }
                                }
                            ]);
                        });
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        },

        testTopLevelJson(test) {
            mockGetDataFromUrl(test, responseNodeData);

            test.expect(globalTests + 1);
            const provOptsCopy = Object.assign(providerOptions, { propertyPathId: '' });
            testProvider.init(provOptsCopy)
                .then(() => {
                    return testProvider.getNodesFromUri('https://example.com', targetOptions)
                        .then((results) => {
                            test.deepEqual(results, [
                                {
                                    id: {
                                        foo: 'bar',
                                        node: {
                                            uuid: 'b10b5485-d6f1-47c2-9153-831dda8e1467',
                                            ips: [
                                                '192.168.0.140',
                                                '10.10.0.10'
                                            ]
                                        }
                                    },
                                    ip: {
                                        public: '10.10.0.10',
                                        private: '192.168.0.140'
                                    }
                                },
                                {
                                    id: {
                                        hello: 'world',
                                        node: {
                                            uuid: '4cd3e814-09b1-4ea6-88f5-9524d45c1eda',
                                            ips: [
                                                '192.168.0.141',
                                                '11.11.0.11'
                                            ]
                                        }
                                    },
                                    ip: {
                                        public: '11.11.0.11',
                                        private: '192.168.0.141'
                                    }
                                }
                            ]);
                        });
                })
                .catch((err) => {
                    test.ok(false, err);
                })
                .finally(() => {
                    test.done();
                });
        }
    }
};
