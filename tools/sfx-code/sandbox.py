"""The restricted runner for a recipe Claude writes for one film (owner #899: "this code runs on its own, may only make a sound file,
touches nothing else on the computer"). A recipe is a small Python file:

    \"\"\"crayon stroke on rough paper: a waxy scratch with grain\"\"\"
    FAMILY = "paper"
    TAGS = ["crayon", "stroke", "rough paper", "writing"]

    def make(rng, p):
        t = tt(p.get("dur") or 0.8)
        ...
        return y            # a mono array, or stereo (n, 2), at SR

It gets numpy (np), scipy.signal (signal) and the owner's sfxlib ingredients (tt, bp, lp, hp, norm, modes, moving_band, space, …, and K for
all of them), and nothing else: no import, no file, no name or attribute that starts with "_", none of numpy's or Python's ways to a file
or the system. Only make.py writes the sound it returns. The app runs it in a process of its own, with a time limit.
"""
import ast
import types

import numpy as np
from scipy import signal as _signal

import sfxlib as _K

SAFE_BUILTINS = {n: __builtins__[n] if isinstance(__builtins__, dict) else getattr(__builtins__, n) for n in (
    "abs", "all", "any", "bool", "dict", "divmod", "enumerate", "filter", "float", "int", "isinstance", "len", "list", "map", "max", "min",
    "pow", "range", "reversed", "round", "set", "slice", "sorted", "str", "sum", "tuple", "zip", "ValueError", "ZeroDivisionError", "True", "False", "None",
) if (n in __builtins__ if isinstance(__builtins__, dict) else hasattr(__builtins__, n))}

BANNED_NAMES = {"open", "exec", "eval", "compile", "globals", "locals", "vars", "getattr", "setattr", "delattr", "input", "breakpoint", "help",
                "memoryview", "type", "object", "super", "exit", "quit", "classmethod", "staticmethod", "property", "id", "hash", "iter", "next"}
BANNED_ATTRS = {"tofile", "dump", "dumps", "save", "savez", "savez_compressed", "savetxt", "load", "loadtxt", "fromfile", "genfromtxt", "memmap",
                "ctypeslib", "ctypes", "lib", "f2py", "testing", "distutils", "os", "sys", "io", "subprocess", "system", "popen", "DataSource",
                "format", "format_map", "mro", "gi_frame", "f_globals", "f_locals", "f_back", "tb_frame", "cr_frame", "write_wav", "wavfile",
                "Path", "ROOT", "show_config", "show_runtime", "get_include", "info", "lookfor", "source"}
SFX = ("SR", "tt", "zeros", "silence", "sos", "bp", "lp", "hp", "norm", "peak", "tail", "place", "put", "osc", "fm", "tone", "click", "sub_kick",
       "env_ad", "bell", "fm_bell", "modes", "transient", "grain", "strokes", "moving_band", "room", "space", "pan", "momentary_max", "NOTE",
       "piano", "string_ks")


def _proxy(mod, names):
    return types.SimpleNamespace(**{n: getattr(mod, n) for n in names if hasattr(mod, n)})


def _public(mod):
    return [n for n in dir(mod) if not n.startswith("_") and n not in BANNED_ATTRS]


class Refused(ValueError):
    pass


def check(src):
    """The recipe's code, refused when it reaches for anything but sound: [why] (empty: fine)."""
    tree = ast.parse(src)
    why = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            why.append(f"line {node.lineno}: no import (np, signal and sfxlib are given)")
        elif isinstance(node, (ast.Global, ast.Nonlocal, ast.AsyncFunctionDef, ast.Await, ast.With, ast.AsyncWith, ast.Try)):
            why.append(f"line {node.lineno}: {type(node).__name__} is not allowed")
        elif isinstance(node, ast.Name) and (node.id.startswith("_") or node.id in BANNED_NAMES):
            why.append(f"line {node.lineno}: the name {node.id!r} is not allowed")
        elif isinstance(node, ast.Attribute) and (node.attr.startswith("_") or node.attr in BANNED_ATTRS):
            why.append(f"line {node.lineno}: .{node.attr} is not allowed")
        elif isinstance(node, ast.Constant) and isinstance(node.value, str) and "__" in node.value and node is not getattr(tree.body[0], "value", None):
            why.append(f"line {node.lineno}: a string with '__' is not allowed")
    return why


def load(path):
    """(make, meta) of a recipe file, or Refused with the reasons."""
    src = open(path, encoding="utf-8").read()  # the runner reads the file; the recipe never can
    why = check(src)
    if why:
        raise Refused("; ".join(why[:5]))
    ns = {"__builtins__": dict(SAFE_BUILTINS), "np": _proxy(np, _public(np)), "signal": _proxy(_signal, _public(_signal)), "K": _proxy(_K, SFX)}
    ns["np"].random = _proxy(np.random, _public(np.random))
    for n in SFX:
        if hasattr(_K, n):
            ns[n] = getattr(_K, n)
    exec(compile(src, "<recipe>", "exec"), ns)  # noqa: S102 - checked above, no builtins beyond SAFE_BUILTINS
    make = ns.get("make")
    if not callable(make):
        raise Refused("the recipe has no make(rng, p)")
    doc = ast.get_docstring(ast.parse(src)) or ""
    return make, {"family": ns.get("FAMILY"), "tags": list(ns.get("TAGS") or []), "about": doc.split("\n")[0]}
