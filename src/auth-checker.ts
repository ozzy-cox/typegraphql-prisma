import { AuthChecker } from "type-graphql";

export const customAuthChecker: AuthChecker<any> = (
    { context: { req } },
) => {
    // here we can read the user from context
    // and check his permission in the db against the `roles` argument
    // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]
    if(req.session.userId) return true 

    return false; // or false if access is denied
};