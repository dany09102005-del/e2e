def to_plain_list(obj):
    """
    Convert numpy objects to plain Python lists for MongoDB storage.
    """
    if hasattr(obj, "tolist"):
        return obj.tolist()
    return obj
