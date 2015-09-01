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

app.post(
    '/back-office/assessments',
    function(request, response, next) {
        _assessments.createAssessment(
            request.body.name,
            [
                [
                    JSON.parse('[' + request.body['test-tags'].split(',').map(function(tag) {return '"' + tag.trim() + '"';}).join(',') + ']'),
                    JSON.parse('[' + request.body['platform-tags'].split(',').map(function(tag) {return '"' + tag.trim() + '"';}).join(',') + ']')
                ]
            ],
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
