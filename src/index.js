var path = require('path');

var RSVP = require('rsvp');
var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var ejs = require('ejs');

var Assessments = require('mm-assessments');
var _assessments = null;
var TestsInterface = require('mm-tests-interface');
var platformMatcher = require('mm-platform-matcher');


var app = express();
app.engine('html', ejs.renderFile);
app.set('views', path.join(__dirname, '../templates'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    '/back-office/static',
    serveStatic(path.join(
        __dirname,
        '..',
        'static'
        ))
);

var mainEntryPoint = function(request, response, next) {
    response.render('main-interface.html', {});
};

app.get(
    '/back-office',
    mainEntryPoint);

app.get(
    '/bo',
    mainEntryPoint);

app.get(
    '/back-office/tests',
    function(request, response, next) {
        response.render('test-editing.html', {});
    });

app.get(
    '/back-office/assessments',
    function(request, response, next) {
        retrieveAdminData()
            .then(function(adminData) {
                response.render('assessments.html', adminData);
            })
            .catch(function(error) {
                console.error(error);
            });
    });

function getNewAssessmentName(assessments) {
    var number = 0;
    var candidateNumber;
    assessments.forEach(function(assessment) {
        console.log('testing name ', assessment.name);
        if(/^unnamed_(\d)+$/.test(assessment.name)) {
            candidateNumber = parseInt(assessment.name.substr(8)) + 1;
            number = (candidateNumber > number) ? candidateNumber : number;
        }
    });
    return 'unnamed_' + number;
}

app.post(
    '/back-office/assessments',
    function(request, response, next) {
        _assessments.getAssessments()
            .then(function(assessments) {
                var assessmentName = request.body.name;
                if(!assessmentName) {
                    assessmentName = getNewAssessmentName(assessments);
                }
                return _assessments.createAssessment(
                    assessmentName,
                    [
                        [
                            JSON.parse('[' + request.body['test-tags'].split(',').map(function(tag) {return '"' + tag.trim() + '"';}).join(',') + ']'),
                            JSON.parse('[' + request.body['platform-tags'].split(',').map(function(tag) {return '"' + tag.trim() + '"';}).join(',') + ']')
                        ]
                    ],
                    +(new Date())
                );
            })
            .then(function() {
                response.redirect('/back-office/assessments');
            })
            .catch(function(error) {
                console.error(error);
            });
    });

app.get(
    '/back-office/results',
    function(request, response, next) {
        var qs = queryString.parse(request.url.split('?')[1]);
        RSVP.hash({
            results: _dataAdapter.reader(),
            assessments: _assessments.getAssessments()
        })
            .then(function(hash) {
                var requestedAssessment = hash.assessments.filter(function(assessment) {return assessment.name === qs.assessment;})[0];
                response.render('results.html', {
                    assessment: requestedAssessment,
                    results: hash.results.filter(function(result) {
                        return _assessments .matchTestToAssessment(result, requestedAssessment);
                    })
                });
            })
            .catch(function(error) {
                console.error(error);
            });
    });

function retrieveAdminData() {
    return RSVP.hash({
        assessments: _assessments.getAssessments(),
        testTags: _testsInterface.getTestTags()
    })
        .then(function(hash) {
            return {
                backOfficeUrl: '/back-office/',
                assessments: hash.assessments,
                testTags: hash.testTags,
                platformTags: platformMatcher.getPlatformTags()
            };
        });
}


module.exports = function(assessments) {
    _assessments = assessments;
    _testsInterface = new TestsInterface(assessments.getDataAdapter());
    return app;
};
