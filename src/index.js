var path = require('path');

var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var Assessments = require('mm-assessments');
var _assessments = null;



var app = express();
app.engine('html', ejs.renderFile);
app.set('views', path.join(__dirname, '../templates'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    '/back-office',
    serveStatic(path.join(
        __dirname,
        '..',
        'static'
        ))
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
    '/assessments',
    function(request, response, next) {
        _assessments.createAssessment(
            request.body['name'],
            request.body['test-tags'],
            request.body['platform-tags'],
            +(new Date())
        )
            .then(function() {
                response.redirect('/admin');
            })
            .catch(function(error) {
                console.error(error);
            });
    });

function retrieveAdminData() {
    return _assessments.getAssessments()
        .then(function(assessments) {
            return {
                backOfficeUrl: '/',
                assessments: assessments
            };
        })
        .catch(function(error) {
            console.error(error);
        });
}


module.exports = function(assessments) {
    _assessments = assessments;
    return app;
};
