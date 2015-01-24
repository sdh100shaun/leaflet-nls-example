module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        less: {
            production: {
                options: {
                    paths: ["css"],
                    cleancss: true,
                    ieCompat:true
                },
                files: {
                    "build/css/style.css": "build/less/main.less"
                }
            }
        },
        lesslint:{
           src: ['build/less/*.less']
        },
        cssmin: {
            production: {
                options: {
                    banner: "/*  */"
                },
                files: {
                    'css/style.min.css': [
						'build/css/style.css'
					]
                }
            }
        },

        concat: {
            production: {
                src: [

					'build/js/uonmap.js','build/js/menu.js'

				],
                dest: 'js/production.js'
            }
        }

		
		
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-lesslint')

    grunt.registerTask('default', ['less', 'lesslint', 'cssmin', 'concat']);
}