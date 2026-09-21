"""Cary, Illinois: the authored landmark survey.

Hooks (see tinytown/site.py):
    landmarks(site, paths)  authored features from the "landmarks" sidecar named
                            in sites/cary/site.json (sites/cary/landmarks.json)

The sidecar stores geographic [lon, lat] coordinates, like Avon's, so the survey
follows the site origin. Cary's survey records mapped boundaries only: no base
positions, fences, dugouts or playground equipment have been independently
surveyed, so none are invented here.
"""
from . import avon as _avon
from .. import site as _site


def landmarks(site, paths):
    path = _site.authored_path(paths, 'landmarks')
    if not path or not path.exists():
        return []
    return _avon.authored_features(site, path)
