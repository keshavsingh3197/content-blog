using MongoDB.Bson;

namespace Blog.Admin.Api.Routing;

/// <summary>
/// Route constraint for the `{id:objectid}` segment: an entity id must look like a Mongo ObjectId
/// before the request is allowed to reach an action.
///
/// Every id in this API is a string carrying <c>[BsonRepresentation(BsonType.ObjectId)]</c>, so a
/// value that is not 24 hex characters throws <see cref="FormatException"/> while the driver
/// serialises the filter. Without this constraint `GET /api/content/abc` answers 500 for what is
/// simply a request for something that cannot exist; with it, routing declines the match and the
/// caller gets the correct 404, with no log noise and nothing reaching the database.
/// </summary>
public sealed class ObjectIdRouteConstraint : IRouteConstraint
{
    public bool Match(
        HttpContext? httpContext,
        IRouter? route,
        string routeKey,
        RouteValueDictionary values,
        RouteDirection routeDirection) =>
        values.TryGetValue(routeKey, out var value) &&
        value is not null &&
        ObjectId.TryParse(value.ToString(), out _);
}
