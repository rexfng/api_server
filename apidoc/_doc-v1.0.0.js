
 /**
 * @api {get} /api/v1/source/:collection/:id GET ONE
 * @apiName Data Id
 * @apiGroup Data Service
 * @apiDescription Get record by :id base on :collection
 * @apiVersion 1.0.0
 *
 * @apiParam {String/Object} [value]  Your custom key-value pair of your data.

 * @apiParamExample {json} Return example:
 *     {{
 *       "_id": 5910dd5df5306e9b11ab4aef,
 		 "key": "value",
 		 "key": "value",
 		 "key": "value"
 *     }}
 */


 /**
 * @api {get} /api/v1/_meta/ DB Meta
 * @apiName _Meta Info
 * @apiGroup Meta Data
 * @apiDescription Get record by :id base on :collection
 * @apiVersion 1.0.0
 *
 * @apiParam {Object} [value]  Receive meta data of mongodb. This is useful to check if a collection has been created.

 */
 /**





 /**
 * @api {get} /api/v1/:collection GET All
 * @apiName Data Get
 * @apiGroup Data Service
 * @apiDescription The Data Service is a dynamic api endpoint according to what you specify in collection.
 * @apiVersion 1.0.0
 *
 * @apiParam {Integer} _id  The bson id of the data, by designed, its datetime information can be extracted from the client side: https://steveridout.github.io/mongo-object-time/
 * @apiParam {String/Object} value  Your custom key-value pair of your data.

 * @apiParamExample {json} Return example:
 *     [{
 *       "_id": 5910dd5df5306e9b11ab4aef,
 		 "key": "value",
 		 "key": "value",
 		 "key": "value"
 *     },{
 *       "_id": 5910dd5df5306e9b11aef213,
 		 "key": "value",
  		 "key": "value",
   		 "key": "value"
 *     }]
 */


  /**
 * @api {get} /api/v1/source/:collection? GET ALL - Filter
 * @apiName Data Get Filter
 * @apiGroup Data Service
 * @apiDescription Provide a query to filter results in a data collection. ie. /api/v1/:type?first_name=Stephen&last_name=Curry&team=Golden+State
 * @apiVersion 1.0.0
 *
 * @apiParam {query} key  To Filter simply put your filter variable against your key. ie first_name=john&last_name=smith
 * @apiParam {query} _expect  White listing the attribute the collection would return. ie ?_expect=first_name+last_name will return the records with only these attributes.
 * @apiParam {query} _limit  Limiting record return per page. ie ?_limit=20 will return 20 records *it has to be used with _page
 * @apiParam {query} _page  Indicate the current page of return records of collection. ie ?_page=1 *not 0-based index, and it has to be used with _limit
 * @apiParam {query} _sortby  The term you would like it to be sorted by. ie ?_sortby=first_name, sortby=id *when sort by id, it will sort by its created _time
 * @apiParam {query} _sortorder  the query determins the sort order, accept either "asc" or "desc" ie ?_sortorder=asc
 * @apiParam {query} _sortas  the query sorts a number string as an integer: 1, 3, 21, 40. Without this option, it sorts number as string: 1, 21, 3, 40. accept only "int" ie ?_sortas=int

 */


 /**
 * @api {get} /api/v1/source/:collection/:id GET ONE
 * @apiName Data Id
 * @apiGroup Data Service
 * @apiDescription Get record by :id base on :collection
 * @apiVersion 1.0.0
 *
 * @apiParam {String/Object} [value]  Your custom key-value pair of your data.

 * @apiParamExample {json} Return example:
 *     {{
 *       "_id": 5910dd5df5306e9b11ab4aef,
 		 "key": "value",
 		 "key": "value",
 		 "key": "value"
 *     }}
 */
 /**

 * @api {post} /api/v1/source/:collection POST
 * @apiName Data Post
 * @apiGroup Data Service
 * @apiDescription Creating an instance of a collection. 
 * @apiVersion 1.0.0
 *
 * @apiParam {String} value  Your custom key-value pair of your data.
 * @apiParam {String} [value]  You can have multiple ones.

 */

  /**

 * @api {post} /api/v1/source/:collection/:id UPDATE
 * @apiName Data Update
 * @apiGroup Data Service
 * @apiDescription Updating key-value of a data object base on collection and id
 * @apiVersion 1.0.0
 *
 * @apiParam {String} value  Your custom key-value pair of your data.
 * @apiParam {String} [value]  You can have multiple ones.

 */

/**

 * @api {delete} /api/v1/source/:collection DELETE All
 * @apiName Data Delete All
 * @apiGroup Data Service
 * @apiDescription Delete all data from a :collection
 * @apiVersion 1.0.0
 *

 */

 /**
 * @api {delete} /api/v1/source/:collection/:id DELETE One
 * @apiName Data Delete
 * @apiGroup Data Service
 * @apiDescription Delete and object based on its :collection and :id
 * @apiVersion 1.0.0
 *

 */


