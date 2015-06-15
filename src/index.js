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

app.get(
    '/back-office',
    function(request, response, next) {
        response.render('main-interface.html', {});
    });

app.get(
    '/back-office/tests',
    function(request, response, next) {
        _testsInterface.getTests()
            .then(function(tests) {
                response.render('test-editing.html', {tests: tests});
            });
    });

app.get(
    '/back-office/assessments',
    function(request, response, next) {
        retrieveAdminData()
            .then(function(adminData) {
                response.render('assessments.html', adminData);
            });
    });

app.post(
    '/assessments',
    function(request, response, next) {
        _assessments.createAssessment(
            request.body['name'],
            request.body['test-tags'],
            request.body['platform-tags'],
            +(new Date())
        )
            .then(function() {
                response.redirect('/back-office/assessments');
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
                backOfficeUrl: '/',
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
