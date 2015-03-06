var path = require('path');

var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var RSVP = require('rsvp');

var platformMatcher = require('platform-matcher');

var _dataAdapter = null;
var objectiveStatuses = {};


var app = express();
app.engine('html', ejs.renderFile);
app.set('views', path.join(__dirname, '../templates'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    '/static',
    serveStatic(path.join(
        __dirname,
        '..',
        'static'
        ))
);

app.get(
    '/memory-dump.json',
    function(request, response, next) {
        return _dataAdapter.getKeys()
            .then(function(keys) {
                return RSVP.all(keys.map(function(key) {
                    return _dataAdapter.get(key);
                }))
                    .then(function(values) {
                        var result = {};
                        values.forEach(function(value, index) {
                            result[keys[index]] = value;
                        });
                        response.send(result);
                    });
            });
    }
);

app.get(
    '/admin',
    function(request, response, next) {
        retrieveAdminData()
            .then(function(adminData) {
                response.render('main-interface.html', adminData);
            })
    });

app.post(
    '/objectives',
    function(request, response, next) {
        var name = request.body['name'];
        var testTags = request.body['test-tags'];
        var platformTags = request.body['platform-tags'];
        var creationTime = +(new Date());

        _dataAdapter.get('objectives')
            .then(function(objectiveNames) {
                objectiveNames.push(creationTime);
                return _dataAdapter.set('objectives', objectiveNames);
            })
            .then(function() {
                return RSVP.all([
                    _dataAdapter.set('objective/' + creationTime + '/name', name),
                    _dataAdapter.set('objective/' + creationTime + '/definition', [[testTags, platformTags]])
                ]);
            })
            .then(function() {
                response.redirect('/admin');
            })
            .catch(function(error) {
                console.error(error);
            });
    });

function convert(tagList) {
    if(typeof tagList !== 'string') {
        return tagList;
    }
    return tagList.split(',').map(function(element) {return element.trim();});
}

function matchTags(candidates, reference) {
    candidates = convert(candidates);
    reference = convert(reference);
    return candidates.every(function(candidate) {
        return reference.indexOf(candidate) !== -1;
    });
}

function reduceTestResults(resultArray) {
    return resultArray.reduce(function(element1, element2) {
        if(element1 === 'no-match') {
            return element2;
        }
        if(element1 === 'failure' || element2 === 'failure') {
            return 'failure';
        }
        if(element1 === 'pending' || element2 === 'pending') {
            return 'pending';
        }
        return 'success';
    }, 'no-match');
}

function getTestResultForEachConstraint(objectiveDefinition, testTags, results, objectiveId) {
    return objectiveDefinition.map(function(definition) {
        // check that the test qualifies for this constraint
        var objectiveTestTags = definition[0];
        var objectivePlatformTags = definition[1].split(',').map(function(tag) {return tag.trim()});

        if(matchTags(objectiveTestTags, testTags)) {
            // check that it was launched on the right platforms
            var matchingResults = (results
                .filter(function(result) {
                    return matchTags(testTags, result.tags) && platformMatcher(objectivePlatformTags, result.ua);
                })
                .filter(function(result) {
                    return result.reportTime > objectiveId;
                }));
            if(!matchingResults.length) {
                return 'pending';
            }
            return matchingResults.every(function(result) {return !result.failures;}) ? 'success' : 'failure';
        }
        return 'no-match';
    });
}

function getTagsFromTest(test) {
    for(var testTags in test) {}
    return testTags;
}

function getObjectiveStatus(tests, objectiveId) {
    var result = [];

    return RSVP.hash({
        results: _dataAdapter.get('results'),
        objectiveDefinition: _dataAdapter.get('objective/' + objectiveId + '/definition')
    })
        .then(function(hash) {
            tests.forEach(function(test) {
                var testResultForEachConstraint = getTestResultForEachConstraint(
                    hash.objectiveDefinition,
                    getTagsFromTest(test),
                    hash.results,
                    objectiveId
                    );
                result = result.concat(testResultForEachConstraint);
            });

            result = reduceTestResults(result);
            return result;
        });
}

function retrieveAdminData() {
    if(!_dataAdapter) {
        throw(new Error('no db interface set'));
    }

    var testResults = _dataAdapter.reader();

    var result = {
        backOfficeUrl: '/'
    };
    var expectedResults = {};
    var testLib;

    return _dataAdapter.get('tests/library')
        .then(function(testLibrary) {
            testLib = testLibrary;
            return _dataAdapter.get('objectives');
        })
        .then(function(objectiveIds) {
            return RSVP.all(objectiveIds.map(function(objectiveId) {
                    return RSVP.hash({
                        name: _dataAdapter.get('objective/' + objectiveId + '/name'),
                        definition: _dataAdapter.get('objective/' + objectiveId + '/definition'),
                        status: getObjectiveStatus(testLib, objectiveId)
                    });
                }))
                .then(function(objectives) {
                    result.objectives = objectives.map(function(objective, index) {
                        return {name: objective.name, status: objective.status, definition: objective.definition, id: objectiveIds[index]};
                    });
                    return result;
                });
        })
        .catch(function(error) {
            console.log(error);
        });
}

function setDataAdapter(dataAdapter) {
    _dataAdapter = dataAdapter;
}


module.exports = {
    middleware: app,
    setDataAdapter: setDataAdapter
};
