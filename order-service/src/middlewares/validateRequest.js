export const validateRequest = (schema) => {
  return (req, res, next) => {

    const result = schema.safeParse(req.body);

    if (!result.success) {

      const errorMessages = result.error.issues.map((issue) => issue.message);
      
      console.log("Zod Blocked the Request. Reason:", errorMessages);
      return res.status(400).json({
        status: "Failed",
        message: "Validation failed: " + errorMessages.join(", ")
      });
    }
    req.body = result.data;
    
    next();
  };
};